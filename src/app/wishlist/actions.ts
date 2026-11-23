"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { monthInputToDate } from "@/lib/dates";

function read(formData: FormData) {
  return {
    country_code: String(formData.get("country_code") ?? ""),
    city: String(formData.get("city") ?? "").trim() || null,
    target_on: monthInputToDate(formData.get("month")),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function addWishlistItem(formData: FormData) {
  const item = read(formData);
  if (!item.country_code) return;

  const supabase = await createClient();
  const { error } = await supabase.from("wishlist_items").insert(item);
  if (error) throw new Error(error.message);
  revalidatePath("/wishlist");
}

export async function updateWishlistItem(id: string, formData: FormData) {
  const item = read(formData);
  if (!item.country_code) return;

  const supabase = await createClient();
  const { error } = await supabase.from("wishlist_items").update(item).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/wishlist");
  redirect("/wishlist");
}

export async function deleteWishlistItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/wishlist");
}

// Calls the Postgres function that moves the item into trips in one transaction.
export async function markVisited(id: string, formData: FormData) {
  const visitedOn = monthInputToDate(formData.get("month"));
  if (!visitedOn) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_wishlist_visited", {
    p_item_id: id,
    p_visited_on: visitedOn,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/wishlist");
  revalidatePath("/trips");
  redirect("/trips");
}
