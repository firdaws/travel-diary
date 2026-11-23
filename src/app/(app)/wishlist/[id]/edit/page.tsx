import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { dateToMonthInput } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import EntryForm from "@/components/entry-form";
import PageHeader from "@/components/page-header";
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
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" render={<Link href="/wishlist" />}>
        <ArrowLeft /> My wishlist
      </Button>
      <PageHeader title="Edit wishlist item" />
      <Card>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
