// Edge Function: visa-lookup
//
// Input:  { destinations: ["JP", "PT", ...] }   (ISO alpha-2 codes, at most 25)
// Output: the visa status of each destination for the CALLER'S passport.
//
// How it works:
//   1. Find the caller's passport from their profile (never trust the browser for this).
//   2. Read the visa_requirements cache table.
//   3. Only for pairs that are missing or old, call the Travel Buddy API and save the answer.
//
// The cache table has no write policy for users, so this function (using the service role
// key) is the only thing that can write to it.
import { createClient } from "npm:@supabase/supabase-js@2";

const STALE_AFTER_DAYS = 90; // visa rules change slowly; re-check after about 3 months
const MAX_DESTINATIONS = 25;
const CONCURRENCY = 3; // be gentle with the API's rate limits

type Status = "visa_free" | "visa_on_arrival" | "evisa" | "eta" | "visa_required";
type Visa = { status: Status; stay_days: number | null; stay_text: string | null; link: string | null };

class UpstreamError extends Error {}

// CORS: the browser calls this function directly from our website, which is a different
// origin from Supabase. Before the real request it sends a "preflight" (OPTIONS) asking
// "may I?". Allowing any origin is safe here because access is decided by the signed-in
// user's token in the Authorization header, not by cookies.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ---------------------------------------------------------------------------
// ADAPTER: everything specific to Travel Buddy lives in the next two functions.
// If their API changes (or we switch provider), this is the only code to touch.
// ---------------------------------------------------------------------------

async function fetchFromTravelBuddy(passport: string, destination: string): Promise<unknown> {
  const key = Deno.env.get("TRAVEL_BUDDY_API_KEY");
  if (!key) throw new UpstreamError("not_configured");
  const base = Deno.env.get("TRAVEL_BUDDY_BASE_URL") ?? "https://visa-requirement.p.rapidapi.com";

  const res = await fetch(`${base}/v2/visa/check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": new URL(base).host,
    },
    body: JSON.stringify({ passport, destination }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {
    throw new UpstreamError("unreachable");
  });

  if (res.status === 429) throw new UpstreamError("rate_limited");
  if (!res.ok) throw new UpstreamError(`upstream_${res.status}`);
  return await res.json().catch(() => {
    throw new UpstreamError("bad_response");
  });
}

// Turn the API's answer into our simple shape. Returns null if we can't make sense of it,
// and we never cache what we don't understand.
function normalize(payload: unknown): Visa | null {
  // deno-lint-ignore no-explicit-any
  // The real API wraps its answer in {"data": {...}}; unwrap it if present.
  const body = (payload as any)?.data ?? payload;
  // deno-lint-ignore no-explicit-any
  const rules = (body as any)?.visa_rules;
  const rule = rules?.primary_rule;
  if (!rule) return null;

  const name = String(rule.name ?? "").toLowerCase();
  const color = String(rule.color ?? "").toLowerCase();

  let status: Status | null = null;
  if (/not required|no visa|visa[- ]free|free/.test(name)) status = "visa_free";
  else if (/arrival/.test(name)) status = "visa_on_arrival";
  else if (/e-?visa|electronic visa/.test(name)) status = "evisa";
  else if (/\beta\b|electronic travel|waiver/.test(name)) status = "eta";
  else if (/required|embassy/.test(name)) status = "visa_required";
  else if (color === "green") status = "visa_free";
  else if (color === "blue") status = "visa_on_arrival";
  else if (color === "yellow") status = "eta";
  else if (color === "red") status = "visa_required";
  if (!status) return null;

  const duration = rule.duration ?? null;
  const stayText = duration === null ? null : String(duration);
  const n = stayText?.match(/\d+/)?.[0];
  let stayDays: number | null = n ? parseInt(n, 10) : null;
  if (stayDays && /month/i.test(stayText ?? "")) stayDays *= 30;

  const link = [rule.link, rules?.secondary_rule?.link].find(
    (l) => typeof l === "string" && /^https?:\/\//.test(l),
  );

  return { status, stay_days: stayDays, stay_text: stayText, link: link ?? null };
}

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const body = await req.json().catch(() => ({}));
  const destinations: string[] = [...new Set(Array.isArray(body.destinations) ? body.destinations : [])]
    .map((d) => String(d).toUpperCase());
  if (
    destinations.length === 0 ||
    destinations.length > MAX_DESTINATIONS ||
    !destinations.every((d) => /^[A-Z]{2}$/.test(d))
  ) {
    return json({ error: `Send 1 to ${MAX_DESTINATIONS} country codes like "JP".` }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL")!;

  // 1. Who is asking, and what is their passport?
  const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await asCaller.auth.getUser();
  if (!user) return json({ error: "Sign in first." }, 401);

  const { data: profile } = await asCaller
    .from("profiles").select("passport_country").eq("id", user.id).single();
  const passport = profile?.passport_country;
  if (!passport) return json({ error: "Set your passport country in your profile first." }, 400);

  // 2. Read the cache.
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: cached } = await admin
    .from("visa_requirements")
    .select("destination_country, status, stay_days, stay_text, link, fetched_at")
    .eq("passport_country", passport)
    .in("destination_country", destinations);
  const cache = new Map((cached ?? []).map((r) => [r.destination_country as string, r]));

  // deno-lint-ignore no-explicit-any
  const results: Record<string, any> = {};
  const staleCutoff = Date.now() - STALE_AFTER_DAYS * 24 * 3600 * 1000;
  const toFetch: string[] = [];

  for (const dest of destinations) {
    const row = cache.get(dest);
    if (dest === passport) results[dest] = { home: true };
    else if (row && new Date(row.fetched_at).getTime() > staleCutoff) results[dest] = row;
    else toFetch.push(dest);
  }

  // 3. Ask the API only for what we're missing (a few at a time).
  async function lookup(dest: string) {
    const old = cache.get(dest);
    try {
      const payload = await fetchFromTravelBuddy(passport, dest);
      const visa = normalize(payload);
      if (!visa) throw new UpstreamError("unrecognized");

      const { error } = await admin.from("visa_requirements").upsert({
        passport_country: passport,
        destination_country: dest,
        ...visa,
        raw: payload,
        fetched_at: new Date().toISOString(),
      });
      if (error) throw new UpstreamError("save_failed");
      results[dest] = { ...visa, fetched_at: new Date().toISOString() };
    } catch (e) {
      const code = e instanceof UpstreamError ? e.message : "unknown";
      // If the API is down but we have an old answer, an old answer beats no answer.
      results[dest] = old ? { ...old, stale: true } : { error: code };
    }
  }

  const queue = [...toFetch];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length) await lookup(queue.shift()!);
    }),
  );

  return json({ passport, results });
});
