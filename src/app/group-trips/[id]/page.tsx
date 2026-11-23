import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { removeMember } from "../actions";
import InviteForm from "./invite-form";
import PlacesSection from "./places-section";

const ghost =
  "cursor-pointer rounded border border-zinc-300 px-2 py-1 text-sm transition hover:bg-zinc-100 active:scale-[0.98] dark:border-zinc-700 dark:hover:bg-zinc-800";

export default async function GroupTripPage({ params, searchParams }: PageProps<"/group-trips/[id]">) {
  const { id } = await params;
  const { member } = await searchParams;
  const selectedMember = typeof member === "string" ? member : undefined;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS returns nothing if you aren't a member, so outsiders get a 404.
  const { data: groupTrip } = await supabase
    .from("group_trips")
    .select("id, name, owner_id, group_trip_members(user_id, role, profiles(name, passport_country))")
    .eq("id", id)
    .single();
  if (!groupTrip) notFound();

  const isOwner = groupTrip.owner_id === user.id;

  // One query for everyone's places, thanks to the group_trip_places view.
  let placesQuery = supabase.from("group_trip_places").select("*").eq("group_trip_id", id);
  if (selectedMember) placesQuery = placesQuery.eq("user_id", selectedMember);
  const { data: places } = await placesQuery;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← All group trips
      </Link>
      <h1 className="text-2xl font-semibold">{groupTrip.name}</h1>

      <PlacesSection
        groupTripId={groupTrip.id}
        members={groupTrip.group_trip_members.map((m) => ({
          user_id: m.user_id,
          name: m.profiles?.name ?? "",
        }))}
        places={places ?? []}
        selectedMember={selectedMember}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Members</h2>
        <ul className="flex flex-col gap-2">
          {groupTrip.group_trip_members.map((m) => {
            const canRemove = m.role !== "owner" && (isOwner || m.user_id === user.id);
            return (
              <li key={m.user_id} className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span>
                  {m.profiles?.name || "Unnamed"}
                  {m.profiles?.passport_country ? ` · ${m.profiles.passport_country}` : " · not set up yet"}
                </span>
                <span className="flex items-center gap-2">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">{m.role}</span>
                  {canRemove && (
                    <form action={removeMember.bind(null, groupTrip.id, m.user_id)}>
                      <button className={ghost}>{m.user_id === user.id ? "Leave" : "Remove"}</button>
                    </form>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {isOwner && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Invite someone</h2>
          <InviteForm groupTripId={groupTrip.id} />
        </section>
      )}
    </main>
  );
}
