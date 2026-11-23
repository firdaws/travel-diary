import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dateToMonthInput } from "@/lib/dates";
import EntryForm from "@/components/entry-form";
import { updateWishlistItem } from "../../actions";

export default async function EditWishlistItemPage({ params }: PageProps<"/wishlist/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: countries }, { data: item }] = await Promise.all([
    supabase.from("countries").select("code, name").order("name"),
    supabase.from("wishlist_items").select("*").eq("id", id).eq("user_id", user.id).single(),
  ]);
  if (!item) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 p-6">
      <Link href="/wishlist" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">← My wishlist</Link>
      <h1 className="text-2xl font-semibold">Edit wishlist item</h1>
      <EntryForm
        action={updateWishlistItem.bind(null, item.id)}
        countries={countries ?? []}
        kind="wish"
        submitLabel="Save changes"
        defaults={{
          country_code: item.country_code,
          city: item.city,
          month: dateToMonthInput(item.target_on),
          notes: item.notes,
        }}
      />
    </main>
  );
}
