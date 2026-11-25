import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Unread chat messages per group trip for the signed-in user. Groups with none are missing.
export async function loadUnread(supabase: SupabaseClient<Database>): Promise<Record<string, number>> {
  const { data } = await supabase.rpc("unread_chat_counts");
  return Object.fromEntries((data ?? []).map((r) => [r.group_trip_id, Number(r.unread)]));
}
