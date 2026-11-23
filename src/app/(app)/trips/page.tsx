import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPinned, Pencil, Trash2, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMonth } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadPhotos } from "@/lib/photos";
import { loadVisaContext } from "@/lib/visa";
import { VisaBadge, VisaDisclaimer, VisaProvider } from "@/components/visa";
import EntryForm from "@/components/entry-form";
import TripPhotos from "@/components/trip-photos";
import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
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

  const photos = await loadPhotos(supabase, trips?.map((t) => t.id) ?? []);
  const visa = await loadVisaContext(supabase, user.id, trips?.map((t) => t.country_code) ?? []);

  return (
    <VisaProvider passport={visa.passport} initial={visa.initial} missing={visa.missing}>
      <PageHeader
        title="Places I've been"
        description="Your travel history. Everyone in your group trips can see it."
        actions={
          <Button variant="outline" render={<Link href="/wishlist" />}>
            <Heart /> My wishlist
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-label="Your trips" className="flex flex-col gap-3">
          {trips?.length === 0 && (
            <EmptyState icon={<MapPinned />} title="Start your travel map">
              Add the first place you&apos;ve visited using the form.
            </EmptyState>
          )}
          {trips?.map((t) => (
            <Card key={t.id} size="sm">
              <CardContent className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-lg leading-snug font-medium">
                    {t.countries?.name ?? t.country_code}
                    {t.city && <span className="font-sans text-base font-normal text-muted-foreground"> · {t.city}</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatMonth(t.visited_on)}</p>
                  <VisaBadge code={t.country_code} className="mt-1.5" />
                  {t.notes && <p className="mt-2 text-sm whitespace-pre-line">{t.notes}</p>}
                  <div className="mt-3">
                    <TripPhotos
                      tripId={t.id}
                      userId={user.id}
                      photos={photos[t.id] ?? []}
                      label={t.countries?.name ?? t.country_code}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${t.countries?.name ?? t.country_code}`} render={<Link href={`/trips/${t.id}/edit`} />}>
                    <Pencil />
                  </Button>
                  <form action={deleteTrip.bind(null, t.id)}>
                    <Button variant="ghost" size="icon" type="submit" aria-label={`Delete ${t.countries?.name ?? t.country_code}`}>
                      <Trash2 />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Add a place</CardTitle>
          </CardHeader>
          <CardContent>
            <EntryForm action={addTrip} countries={countries ?? []} kind="trip" submitLabel="Add trip" />
          </CardContent>
        </Card>
      </div>
      <div className="mt-6"><VisaDisclaimer /></div>
    </VisaProvider>
  );
}
