import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type VisaStatus = "visa_free" | "visa_on_arrival" | "evisa" | "eta" | "visa_required";

export type VisaRow = {
  status: VisaStatus;
  stay_days: number | null;
  stay_text: string | null;
  link: string | null;
};

const STALE_AFTER_MS = 90 * 24 * 3600 * 1000; // same rule as the Edge Function

// Server side: read what we already know about these countries for one passport.
// This is a plain, fast table read. The Edge Function is only called for what's missing.
export async function loadVisaContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  countryCodes: string[],
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("passport_country")
    .eq("id", userId)
    .single();
  const passport = profile?.passport_country ?? null;
  const codes = [...new Set(countryCodes)].filter((c) => c !== passport);

  const initial: Record<string, VisaRow> = {};
  const missing: string[] = [];

  if (passport && codes.length > 0) {
    const { data: rows } = await supabase
      .from("visa_requirements")
      .select("destination_country, status, stay_days, stay_text, link, fetched_at")
      .eq("passport_country", passport)
      .in("destination_country", codes);

    const known = new Map((rows ?? []).map((r) => [r.destination_country, r]));
    for (const code of codes) {
      const row = known.get(code);
      if (row) {
        const { status, stay_days, stay_text, link } = row;
        initial[code] = { status: status as VisaStatus, stay_days, stay_text, link };
      }
      // Missing, or older than 90 days: ask the function in the background.
      if (!row || Date.now() - new Date(row.fetched_at).getTime() > STALE_AFTER_MS) missing.push(code);
    }
  }

  return { passport, initial, missing };
}
