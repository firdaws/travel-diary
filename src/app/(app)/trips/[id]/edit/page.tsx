import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { dateToMonthInput } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import EntryForm from "@/components/entry-form";
import PageHeader from "@/components/page-header";
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
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" render={<Link href="/trips" />}>
        <ArrowLeft /> Places I&apos;ve been
      </Button>
      <PageHeader title="Edit trip" />
      <Card>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
