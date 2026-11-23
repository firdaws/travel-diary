import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, LogOut, UserMinus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/page-header";
import { loadPhotos } from "@/lib/photos";
import { loadVisaContext } from "@/lib/visa";
import { VisaDisclaimer, VisaProvider } from "@/components/visa";
import { removeMember } from "../actions";
import InviteForm from "./invite-form";
import PlacesSection from "./places-section";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function GroupTripPage({ params, searchParams }: PageProps<"/group-trips/[id]">) {
  const { id } = await params;
  const { member } = await searchParams;
  const selectedMember = typeof member === "string" ? member : undefined;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS returns nothing if you aren't a member, so outsiders get a 404.
  const { data: groupTrip } = await supabase
    .from("group_trips")
    .select("id, name, owner_id, group_trip_members(user_id, role, profiles(name, passport_country))")
    .eq("id", id)
    .single();
  if (!groupTrip) notFound();

  const isOwner = groupTrip.owner_id === user.id;

  // One query for everyone's places, thanks to the group_trip_places view.
  let placesQuery = supabase.from("group_trip_places").select("*").eq("group_trip_id", id);
  if (selectedMember) placesQuery = placesQuery.eq("user_id", selectedMember);
  const { data: places } = await placesQuery;

  // Photos of the visited places shown. Storage rules decide what we may see.
  const visitedIds = (places ?? []).filter((p) => p.kind === "visited" && p.place_id).map((p) => p.place_id!);
  const photos = await loadPhotos(supabase, visitedIds);
  const visa = await loadVisaContext(supabase, user.id, (places ?? []).map((p) => p.country_code!).filter(Boolean));

  return (
    <VisaProvider passport={visa.passport} initial={visa.initial} missing={visa.missing}>
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" render={<Link href="/group-trips" />}>
        <ArrowLeft /> Group trips
      </Button>
      <PageHeader
        title={groupTrip.name}
        description="Where everyone has been, and where they'd like to go."
        actions={<Badge variant={isOwner ? "default" : "secondary"}>{isOwner ? "You own this" : "Member"}</Badge>}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <PlacesSection
          groupTripId={groupTrip.id}
          members={groupTrip.group_trip_members.map((m) => ({
            user_id: m.user_id,
            name: m.profiles?.name ?? "",
          }))}
          places={places ?? []}
          photos={photos}
          selectedMember={selectedMember}
        />

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Members</CardTitle>
              <CardDescription>
                {groupTrip.group_trip_members.length} in this group trip
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {groupTrip.group_trip_members.map((m) => {
                  const name = m.profiles?.name || "Unnamed";
                  const canRemove = m.role !== "owner" && (isOwner || m.user_id === user.id);
                  const leaving = m.user_id === user.id;
                  return (
                    <li key={m.user_id} className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                          {initials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {name}
                          {m.role === "owner" && <span className="font-normal text-muted-foreground"> · owner</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.profiles?.passport_country ? `Passport: ${m.profiles.passport_country}` : "Hasn't finished setup"}
                        </p>
                      </div>
                      {canRemove && (
                        <form action={removeMember.bind(null, groupTrip.id, m.user_id)}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            aria-label={leaving ? "Leave group trip" : `Remove ${name}`}
                          >
                            {leaving ? <LogOut /> : <UserMinus />}
                          </Button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-xl">Invite someone</CardTitle>
                <CardDescription>They&apos;ll get an email with a link to join.</CardDescription>
              </CardHeader>
              <CardContent>
                <InviteForm groupTripId={groupTrip.id} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <div className="mt-6"><VisaDisclaimer /></div>
    </VisaProvider>
  );
}
