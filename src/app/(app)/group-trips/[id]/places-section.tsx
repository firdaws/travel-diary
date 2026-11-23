import Link from "next/link";
import { Globe2 } from "lucide-react";
import type { Database } from "@/lib/database.types";
import { formatMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import EmptyState from "@/components/empty-state";

type Place = Database["public"]["Views"]["group_trip_places"]["Row"];
type Member = { user_id: string; name: string };

// Everyone's visited places and wishlist, grouped by country.
export default function PlacesSection({
  groupTripId,
  members,
  places,
  selectedMember,
}: {
  groupTripId: string;
  members: Member[];
  places: Place[];
  selectedMember?: string;
}) {
  // Group rows by country.
  const byCountry = new Map<string, { name: string; rows: Place[] }>();
  for (const p of places) {
    const code = p.country_code ?? "";
    const entry = byCountry.get(code) ?? { name: p.country_name ?? code, rows: [] };
    entry.rows.push(p);
    byCountry.set(code, entry);
  }
  // Countries shared by the most members first, then A to Z.
  const countries = [...byCountry.entries()]
    .map(([code, v]) => ({ code, ...v, people: new Set(v.rows.map((r) => r.user_id)).size }))
    .sort((a, b) => b.people - a.people || a.name.localeCompare(b.name));

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "bg-background hover:bg-muted",
    );

  return (
    <section aria-label="Where everyone has been" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/group-trips/${groupTripId}`} className={chip(!selectedMember)} aria-current={!selectedMember ? "true" : undefined}>
          Everyone
        </Link>
        {members.map((m) => (
          <Link
            key={m.user_id}
            href={`/group-trips/${groupTripId}?member=${m.user_id}`}
            className={chip(selectedMember === m.user_id)}
            aria-current={selectedMember === m.user_id ? "true" : undefined}
          >
            {m.name || "Unnamed"}
          </Link>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {countries.length} {countries.length === 1 ? "country" : "countries"} · {places.length}{" "}
        {places.length === 1 ? "place" : "places"}
      </p>

      {countries.length === 0 && (
        <EmptyState icon={<Globe2 />} title="Nothing to show yet">
          Members&apos; visited places and wishlists appear here as they add them.
        </EmptyState>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {countries.map((c) => (
          <Card key={c.code} size="sm">
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-medium">{c.name}</h3>
                {c.people > 1 && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    {c.people} members
                  </span>
                )}
              </div>
              <ul className="flex flex-col gap-1.5 text-sm">
                {[...c.rows]
                  .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "visited" ? -1 : 1))
                  .map((r) => (
                    <li key={`${r.kind}-${r.place_id}`} className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
                          r.kind === "visited" ? "bg-visited text-visited-foreground" : "bg-wish text-wish-foreground",
                        )}
                      >
                        {r.kind === "visited" ? "Been" : "Wants to go"}
                      </span>
                      <span>
                        <strong className="font-medium">{r.member_name || "Unnamed"}</strong>
                        <span className="text-muted-foreground">
                          {r.city ? ` · ${r.city}` : ""}
                          {r.month_on ? ` · ${r.kind === "wishlist" ? "aiming for " : ""}${formatMonth(r.month_on)}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
