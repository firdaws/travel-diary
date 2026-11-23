import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, passport_country")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Your profile</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Your passport decides which visa rules you see.
      </p>
      <ProfileForm
        userId={user.id}
        initialName={profile?.name ?? ""}
        initialPassport={profile?.passport_country ?? ""}
      />
    </main>
  );
}
