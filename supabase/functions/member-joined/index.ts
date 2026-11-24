// Edge Function: member-joined
//
// Called by a database webhook (see notify_member_added in the migrations) whenever
// someone is added to a group trip. It records the event in the activity feed.
//
// This is a good place to add side effects later: an email to the owner, a Slack message...
// The database doesn't wait for this function, so slow work here never slows down the app.
//
// There's no logged-in user here: the caller is the database itself. So instead of a user
// token, the request carries a shared secret in a header. (Hence verify_jwt = false in config.toml.)
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Compare secrets in constant time so response timing can't leak how many characters matched.
function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const expected = Deno.env.get("WEBHOOK_SECRET");
  const given = req.headers.get("x-webhook-secret") ?? "";
  if (!expected || !safeEqual(given, expected)) return json({ error: "Unauthorized" }, 401);

  const event = await req.json().catch(() => null);
  const record = event?.record;
  if (
    event?.type !== "INSERT" ||
    event?.table !== "group_trip_members" ||
    !record?.group_trip_id ||
    !record?.user_id ||
    record.role === "owner"
  ) {
    return json({ ignored: true });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.from("group_trip_activity").insert({
    group_trip_id: record.group_trip_id,
    actor_id: record.user_id,
    type: "member_added",
  });
  if (error) return json({ error: "Could not save activity" }, 500);

  return json({ ok: true });
});
