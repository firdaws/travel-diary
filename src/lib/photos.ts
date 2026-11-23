import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const PHOTO_BUCKET = "trip-photos";

export type PhotoItem = { id: string; tripId: string; path: string; url: string };

// The bucket is private, so every image needs a short-lived "signed URL".
// Storage only creates one if the RLS rules allow the signed-in user to read that file.
export async function loadPhotos(
  supabase: SupabaseClient<Database>,
  tripIds: string[],
): Promise<Record<string, PhotoItem[]>> {
  const byTrip: Record<string, PhotoItem[]> = {};
  if (tripIds.length === 0) return byTrip;

  const { data: rows } = await supabase
    .from("trip_photos")
    .select("id, trip_id, storage_path")
    .in("trip_id", tripIds)
    .order("created_at");
  if (!rows?.length) return byTrip;

  const { data: signed } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(rows.map((r) => r.storage_path), 60 * 60);
  const urlByPath = new Map(signed?.map((s) => [s.path, s.signedUrl]));

  for (const r of rows) {
    const url = urlByPath.get(r.storage_path);
    if (!url) continue;
    (byTrip[r.trip_id] ??= []).push({ id: r.id, tripId: r.trip_id, path: r.storage_path, url });
  }
  return byTrip;
}
