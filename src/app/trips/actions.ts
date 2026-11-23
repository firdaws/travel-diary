"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { monthInputToDate } from "@/lib/dates";

function read(formData: FormData) {
  return {
    country_code: String(formData.get("country_code") ?? ""),
    city: String(formData.get("city") ?? "").trim() || null,
    visited_on: monthInputToDate(formData.get("month")),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function addTrip(formData: FormData) {
  const trip = read(formData);
  if (!trip.country_code || !trip.visited_on) return;

  const supabase = await createClient();
  // user_id is filled in by the database (default auth.uid()); RLS checks it.
  const { error } = await supabase.from("trips").insert({ ...trip, visited_on: trip.visited_on });
  if (error) throw new Error(error.message);
  revalidatePath("/trips");
}

export async function updateTrip(id: string, formData: FormData) {
  const trip = read(formData);
  if (!trip.country_code || !trip.visited_on) return;

  const supabase = await createClient();
  const { error } = await supabase.from("trips").update({ ...trip, visited_on: trip.visited_on }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/trips");
  redirect("/trips");
}

export async function deleteTrip(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/trips");
}
