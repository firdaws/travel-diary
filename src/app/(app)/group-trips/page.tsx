import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
import { themeOf } from "@/lib/themes";
import { loadUnread } from "@/lib/unread";
import UnreadDot from "@/components/unread-dot";
import UnreadLive from "@/components/unread-live";
import { createGroupTrip } from "./actions";

export default async function GroupTripsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: groupTrips } = await supabase
    .from("group_trips")
    .select("id, name, owner_id, theme, group_trip_members(count)")
    .order("created_at", { ascending: false });

  const unread = await loadUnread(supabase);

  return (
    <>
      <UnreadLive groupTripIds={(groupTrips ?? []).map((g) => g.id)} userId={user.id} />
      <PageHeader
        title="Group trips"
        description="Pull everyone's visited places and wishlists into one view."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-label="Your group trips" className="flex flex-col gap-3">
          {groupTrips?.length === 0 && (
            <EmptyState icon={<Users />} title="No group trips yet">
              Create one, then invite the people you travel with by email.
            </EmptyState>
          )}
          {groupTrips?.map((g) => {
            const members = g.group_trip_members[0]?.count ?? 0;
            return (
              <Link key={g.id} href={`/group-trips/${g.id}`} className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <Card size="sm" className="transition-colors group-hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-heading flex items-center gap-2 text-lg leading-snug font-medium">
                        <span data-group-theme={themeOf(g.theme)} className="size-3 shrink-0 rounded-full bg-primary" aria-hidden />
                        {g.name}
                        <UnreadDot count={unread[g.id]} />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {members} {members === 1 ? "member" : "members"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={g.owner_id === user.id ? "default" : "secondary"}>
                        {g.owner_id === user.id ? "Owner" : "Member"}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Start a group trip</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createGroupTrip} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required maxLength={80} placeholder="Summer in Portugal" />
              </div>
              <Button type="submit" size="lg">Create group trip</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
