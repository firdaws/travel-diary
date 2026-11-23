import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMonth } from "@/lib/dates";
import { btnSmall } from "@/lib/ui";
import EntryForm from "@/components/entry-form";
import { addTrip, deleteTrip } from "./actions";

export default async function TripsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: countries }, { data: trips }] = await Promise.all([
    supabase.from("countries").select("code, name").order("name"),
    // Group trip members' rows are readable too, so filter to your own here.
    supabase
      .from("trips")
      .select("id, country_code, city, visited_on, notes, countries(name)")
      .eq("user_id", user.id)
      .order("visited_on", { ascending: false }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">← Home</Link>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Places I&apos;ve been</h1>
        <Link href="/wishlist" className="text-sm underline">My wishlist</Link>
      </div>

      <ul className="flex flex-col gap-2">
        {trips?.length === 0 && (
          <li className="text-zinc-600 dark:text-zinc-400">
            No trips yet. Add the first place you&apos;ve visited below.
          </li>
        )}
        {trips?.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-3 rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <div>
              <div className="font-medium">
                {t.countries?.name ?? t.country_code}
                {t.city ? ` · ${t.city}` : ""}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">{formatMonth(t.visited_on)}</div>
              {t.notes && <p className="mt-1 text-sm whitespace-pre-line">{t.notes}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href={`/trips/${t.id}/edit`} className={btnSmall}>Edit</Link>
              <form action={deleteTrip.bind(null, t.id)}>
                <button className={btnSmall}>Delete</button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Add a place</h2>
        <EntryForm action={addTrip} countries={countries ?? []} kind="trip" submitLabel="Add trip" />
      </section>
    </main>
  );
}
