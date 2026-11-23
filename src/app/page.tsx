import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Hi {profile.name || user.email}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Passport: {profile.passport_country}. Diaries come next.
      </p>
      <div className="flex gap-3">
        <Link className="cursor-pointer rounded border border-zinc-300 px-3 py-2 transition hover:bg-zinc-100 active:scale-[0.98] active:bg-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:active:bg-zinc-700" href="/profile">
          Edit profile
        </Link>
        <form action={signOut}>
          <button className="cursor-pointer rounded border border-zinc-300 px-3 py-2 transition hover:bg-zinc-100 active:scale-[0.98] active:bg-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:active:bg-zinc-700">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
