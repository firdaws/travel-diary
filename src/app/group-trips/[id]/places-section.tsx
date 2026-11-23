import Link from "next/link";
import type { Database } from "@/lib/database.types";
import { formatMonth } from "@/lib/dates";

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
    `rounded-full border px-3 py-1 text-sm transition ${
      active
        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
        : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
    }`;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Where everyone has been</h2>

      <div className="flex flex-wrap gap-2">
        <Link href={`/group-trips/${groupTripId}`} className={chip(!selectedMember)}>Everyone</Link>
        {members.map((m) => (
          <Link
            key={m.user_id}
            href={`/group-trips/${groupTripId}?member=${m.user_id}`}
            className={chip(selectedMember === m.user_id)}
          >
            {m.name || "Unnamed"}
          </Link>
        ))}
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {countries.length} {countries.length === 1 ? "country" : "countries"} · {places.length}{" "}
        {places.length === 1 ? "place" : "places"}
      </p>

      <ul className="flex flex-col gap-2">
        {countries.length === 0 && (
          <li className="text-zinc-600 dark:text-zinc-400">
            Nothing here yet. Members&apos; visited places and wishlists show up here.
          </li>
        )}
        {countries.map((c) => (
          <li key={c.code} className="rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.name}</span>
              {c.people > 1 && (
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                  {c.people} members
                </span>
              )}
            </div>
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {[...c.rows]
                .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "visited" ? -1 : 1))
                .map((r) => (
                  <li key={`${r.kind}-${r.place_id}`} className="flex items-baseline gap-2">
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${
                        r.kind === "visited"
                          ? "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200"
                          : "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200"
                      }`}
                    >
                      {r.kind === "visited" ? "Been" : "Wants to go"}
                    </span>
                    <span>
                      <strong className="font-medium">{r.member_name || "Unnamed"}</strong>
                      {r.city ? ` · ${r.city}` : ""}
                      {r.month_on ? ` · ${r.kind === "wishlist" ? "aiming for " : ""}${formatMonth(r.month_on)}` : ""}
                    </span>
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
