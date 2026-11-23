import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: countries }] = await Promise.all([
    supabase.from("profiles").select("name, passport_country").eq("id", user.id).single(),
    supabase.from("countries").select("code, name").order("name"),
  ]);
  const firstTime = !profile?.passport_country;

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            {firstTime ? "Welcome! Tell us about you" : "Your profile"}
          </CardTitle>
          <CardDescription>
            Your passport decides which visa rules you&apos;ll see for each country.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            userId={user.id}
            initialName={profile?.name ?? ""}
            initialPassport={profile?.passport_country ?? ""}
            countries={countries ?? []}
            firstTime={firstTime}
          />
        </CardContent>
      </Card>
    </div>
  );
}
