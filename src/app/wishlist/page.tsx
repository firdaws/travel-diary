import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMonth } from "@/lib/dates";
import { btnSmall, field } from "@/lib/ui";
import EntryForm from "@/components/entry-form";
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

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">← Home</Link>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">My wishlist</h1>
        <Link href="/trips" className="text-sm underline">Places I&apos;ve been</Link>
      </div>

      <ul className="flex flex-col gap-2">
        {items?.length === 0 && (
          <li className="text-zinc-600 dark:text-zinc-400">
            Nothing here yet. Add a place you&apos;d love to visit below.
          </li>
        )}
        {items?.map((w) => (
          <li key={w.id} className="flex flex-col gap-2 rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">
                  {w.countries?.name ?? w.country_code}
                  {w.city ? ` · ${w.city}` : ""}
                </div>
                {w.target_on && (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Aiming for {formatMonth(w.target_on)}</div>
                )}
                {w.notes && <p className="mt-1 text-sm whitespace-pre-line">{w.notes}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={`/wishlist/${w.id}/edit`} className={btnSmall}>Edit</Link>
                <form action={deleteWishlistItem.bind(null, w.id)}>
                  <button className={btnSmall}>Delete</button>
                </form>
              </div>
            </div>
            <form action={markVisited.bind(null, w.id)} className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-2">
                Visited in
                <input name="month" type="month" required className={`${field} w-auto py-1`} />
              </label>
              <button className={btnSmall}>Mark as visited</button>
            </form>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Add to wishlist</h2>
        <EntryForm action={addWishlistItem} countries={countries ?? []} kind="wish" submitLabel="Add to wishlist" />
      </section>
    </main>
  );
}
