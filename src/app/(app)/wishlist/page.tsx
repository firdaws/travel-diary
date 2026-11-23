import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Heart, MapPinned, Pencil, Sparkles, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMonth } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadVisaContext } from "@/lib/visa";
import { VisaBadge, VisaDisclaimer, VisaProvider } from "@/components/visa";
import EntryForm from "@/components/entry-form";
import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
import { addWishlistItem, deleteWishlistItem, markVisited } from "./actions";

export default async function WishlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: countries }, { data: items }] = await Promise.all([
    supabase.from("countries").select("code, name").order("name"),
    supabase
      .from("wishlist_items")
      .select("id, country_code, city, target_on, notes, countries(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const visa = await loadVisaContext(supabase, user.id, items?.map((w) => w.country_code) ?? []);

  return (
    <VisaProvider passport={visa.passport} initial={visa.initial} missing={visa.missing}>
      <PageHeader
        title="My wishlist"
        description="Places you'd love to go. Tick them off when you do."
        actions={
          <Button variant="outline" render={<Link href="/trips" />}>
            <MapPinned /> Places I&apos;ve been
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-label="Your wishlist" className="flex flex-col gap-3">
          {items?.length === 0 && (
            <EmptyState icon={<Sparkles />} title="Where to next?">
              Add a place you&apos;d love to visit using the form.
            </EmptyState>
          )}
          {items?.map((w) => (
            <Card key={w.id} size="sm">
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading text-lg leading-snug font-medium">
                      {w.countries?.name ?? w.country_code}
                      {w.city && <span className="font-sans text-base font-normal text-muted-foreground"> · {w.city}</span>}
                    </p>
                    {w.target_on && (
                      <p className="text-sm text-muted-foreground">Aiming for {formatMonth(w.target_on)}</p>
                    )}
                    <VisaBadge code={w.country_code} className="mt-1.5" />
                    {w.notes && <p className="mt-2 text-sm whitespace-pre-line">{w.notes}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${w.countries?.name ?? w.country_code}`} render={<Link href={`/wishlist/${w.id}/edit`} />}>
                      <Pencil />
                    </Button>
                    <form action={deleteWishlistItem.bind(null, w.id)}>
                      <Button variant="ghost" size="icon" type="submit" aria-label={`Delete ${w.countries?.name ?? w.country_code}`}>
                        <Trash2 />
                      </Button>
                    </form>
                  </div>
                </div>
                <form action={markVisited.bind(null, w.id)} className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/60 p-2.5">
                  <div className="grid gap-1">
                    <Label htmlFor={`visited-${w.id}`} className="text-xs text-muted-foreground">Visited in</Label>
                    <Input id={`visited-${w.id}`} name="month" type="month" required className="h-8 w-auto" />
                  </div>
                  <Button type="submit" variant="secondary">
                    <Check /> Mark as visited
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2 text-xl">
              <Heart className="size-5 text-muted-foreground" aria-hidden /> Add to wishlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EntryForm action={addWishlistItem} countries={countries ?? []} kind="wish" submitLabel="Add to wishlist" />
          </CardContent>
        </Card>
      </div>
      <div className="mt-6"><VisaDisclaimer /></div>
    </VisaProvider>
  );
}
