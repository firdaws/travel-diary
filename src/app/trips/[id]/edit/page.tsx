import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dateToMonthInput } from "@/lib/dates";
import EntryForm from "@/components/entry-form";
import { updateTrip } from "../../actions";

export default async function EditTripPage({ params }: PageProps<"/trips/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: countries }, { data: trip }] = await Promise.all([
    supabase.from("countries").select("code, name").order("name"),
    // Must be your own row: group members can read others' trips but not edit them.
    supabase.from("trips").select("*").eq("id", id).eq("user_id", user.id).single(),
  ]);
  if (!trip) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      <Link href="/trips" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">← My trips</Link>
      <h1 className="text-2xl font-semibold">Edit trip</h1>
      <EntryForm
        action={updateTrip.bind(null, trip.id)}
        countries={countries ?? []}
        kind="trip"
        submitLabel="Save changes"
        defaults={{
          country_code: trip.country_code,
          city: trip.city,
          month: dateToMonthInput(trip.visited_on),
          notes: trip.notes,
        }}
      />
    </main>
  );
}
