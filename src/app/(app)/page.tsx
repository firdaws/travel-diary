import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Globe2, Heart, MapPinned, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMonth } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EmptyState from "@/components/empty-state";
import WorldMap, { type MapMark } from "@/components/world-map";
import { themeOf } from "@/lib/themes";

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

  const [{ data: trips }, { count: wishCount }, { data: groupTrips }, { data: wishes }] = await Promise.all([
    supabase
      .from("trips")
      .select("id, country_code, city, visited_on, countries(name)")
      .eq("user_id", user.id)
      .order("visited_on", { ascending: false }),
    supabase.from("wishlist_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("group_trips").select("id, name, owner_id, theme").order("created_at", { ascending: false }),
    supabase.from("wishlist_items").select("country_code, countries(name)").eq("user_id", user.id),
  ]);

  // Your own map: where you've been, and where you'd like to go.
  const markMap = new Map<string, MapMark>();
  for (const t of trips ?? []) {
    markMap.set(t.country_code, { code: t.country_code, name: t.countries?.name ?? t.country_code, been: ["You"], wants: [] });
  }
  for (const w of wishes ?? []) {
    const m = markMap.get(w.country_code) ?? { code: w.country_code, name: w.countries?.name ?? w.country_code, been: [], wants: [] };
    m.wants = ["You"];
    markMap.set(w.country_code, m);
  }

  const countryCount = new Set(trips?.map((t) => t.country_code)).size;
  const firstName = (profile.name || "").split(" ")[0] || "traveler";

  const stats = [
    { label: "Countries visited", value: countryCount, icon: Globe2 },
    { label: "Trips logged", value: trips?.length ?? 0, icon: MapPinned },
    { label: "On your wishlist", value: wishCount ?? 0, icon: Heart },
    { label: "Group trips", value: groupTrips?.length ?? 0, icon: Users },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Hello, {firstName}</h1>
        <p className="mt-1 text-muted-foreground">Here&apos;s your travel diary at a glance.</p>
      </div>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardContent className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-heading text-2xl leading-none font-semibold">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">Your map</CardTitle>
        </CardHeader>
        <CardContent>
          <WorldMap marks={[...markMap.values()]} label="You" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Recent trips</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/trips" />}>
                All places <ArrowRight />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {trips?.length === 0 && (
              <EmptyState icon={<MapPinned />} title="No trips yet">
                Log the first place you&apos;ve been.
              </EmptyState>
            )}
            {trips?.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-baseline justify-between gap-3 border-b py-2 last:border-0">
                <span className="font-medium">
                  {t.countries?.name ?? t.country_code}
                  {t.city && <span className="font-normal text-muted-foreground"> · {t.city}</span>}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">{formatMonth(t.visited_on)}</span>
              </div>
            ))}
            {trips?.length === 0 && (
              <Button className="mt-3 self-start" render={<Link href="/trips" />}>
                <Plus /> Add a trip
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Your group trips</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/group-trips" />}>
                Manage <ArrowRight />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {groupTrips?.length === 0 && (
              <EmptyState icon={<Users />} title="Plan with friends">
                Start a group trip and invite the people you travel with.
              </EmptyState>
            )}
            {groupTrips?.slice(0, 5).map((g) => (
              <Link
                key={g.id}
                href={`/group-trips/${g.id}`}
                className="-mx-2 flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted"
              >
                <span className="flex items-center gap-2 font-medium">
                  <span data-group-theme={themeOf(g.theme)} className="size-2.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {g.name}
                </span>
                <Badge variant={g.owner_id === user.id ? "default" : "secondary"}>
                  {g.owner_id === user.id ? "Owner" : "Member"}
                </Badge>
              </Link>
            ))}
            {groupTrips?.length === 0 && (
              <Button className="mt-3 self-start" render={<Link href="/group-trips" />}>
                <Plus /> New group trip
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
