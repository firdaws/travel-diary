"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isThemeKey } from "@/lib/themes";

export async function createGroupTrip(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const supabase = await createClient();
  // owner_id is filled in by the database (default auth.uid()); RLS checks it.
  const { data, error } = await supabase
    .from("group_trips")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  redirect(`/group-trips/${data.id}`);
}

export type InviteState = { ok: boolean; message: string } | null;

export async function inviteMember(
  groupTripId: string,
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name || !email) return { ok: false, message: "Enter a name and an email." };

  const supabase = await createClient();
  // Calls the Edge Function, passing the signed-in user's token automatically.
  const { data, error } = await supabase.functions.invoke("invite-member", {
    body: { groupTripId, name, email },
  });

  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    return { ok: false, message: detail?.error ?? "Couldn't send the invite. Try again." };
  }

  revalidatePath(`/group-trips/${groupTripId}`);
  return {
    ok: true,
    message:
      data.status === "invited"
        ? `Invite sent to ${email}.`
        : `${name} already has an account and was added.`,
  };
}

export async function removeMember(groupTripId: string, userId: string) {
  const supabase = await createClient();
  // RLS only allows this for the owner (or for you removing yourself).
  const { error } = await supabase
    .from("group_trip_members")
    .delete()
    .eq("group_trip_id", groupTripId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath(`/group-trips/${groupTripId}`);
}

export async function setGroupTripTheme(groupTripId: string, formData: FormData) {
  const preset = formData.get("preset");
  if (!isThemeKey(preset)) return;

  const supabase = await createClient();
  // RLS only lets the owner update a group trip. For anyone else the update matches zero
  // rows and raises no error, so we ask for the row back to tell the difference.
  const { data, error } = await supabase
    .from("group_trips")
    .update({ theme: { preset } })
    .eq("id", groupTripId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Only the owner can change the theme.");
  revalidatePath(`/group-trips/${groupTripId}`);
}
