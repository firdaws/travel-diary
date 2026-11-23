import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createGroupTrip } from "./group-trips/actions";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, passport_country")
    .eq("id", user.id)
    .single();

  // New users must finish their profile first.
  if (!profile?.passport_country) redirect("/profile");

  const { data: groupTrips } = await supabase
    .from("group_trips")
    .select("id, name, owner_id")
    .order("created_at", { ascending: false });

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Hi {profile.name || user.email}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Passport: {profile.passport_country}
      </p>

      <h2 className="mt-2 text-lg font-medium">Your group trips</h2>
      <ul className="flex flex-col gap-2">
        {groupTrips?.length === 0 && (
          <li className="text-zinc-600 dark:text-zinc-400">
            Start a group trip and invite the people you travel with.
          </li>
        )}
        {groupTrips?.map((d) => (
          <li key={d.id}>
            <Link
              href={`/group-trips/${d.id}`}
              className="flex items-center justify-between rounded border border-zinc-200 px-3 py-2 transition hover:bg-zinc-100 active:scale-[0.99] dark:border-zinc-800 dark:hover:bg-zinc-800"
            >
              <span>{d.name}</span>
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                {d.owner_id === user.id ? "owner" : "member"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <form action={createGroupTrip} className="flex gap-2">
        <input
          name="name"
          required
          placeholder="New group trip name"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button className="cursor-pointer rounded bg-black px-3 py-2 text-white transition hover:bg-zinc-700 active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-zinc-300">
          Create group trip
        </button>
      </form>
      <div className="flex gap-3">
        <Link className="cursor-pointer rounded border border-zinc-300 px-3 py-2 transition hover:bg-zinc-100 active:scale-[0.98] active:bg-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:active:bg-zinc-700" href="/profile">
          Edit profile
        </Link>
        <form action={signOut}>
          <button className="cursor-pointer rounded border border-zinc-300 px-3 py-2 transition hover:bg-zinc-100 active:scale-[0.98] active:bg-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:active:bg-zinc-700">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
