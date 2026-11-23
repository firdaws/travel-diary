"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfileForm({
  userId,
  initialName,
  initialPassport,
  countries,
}: {
  userId: string;
  initialName: string;
  initialPassport: string;
  countries: { code: string; name: string }[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(initialName);
  const [passport, setPassport] = useState(initialPassport);
  const [message, setMessage] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setMessage("Enter your name.");
    if (!passport) return setMessage("Choose your passport country.");
    // RLS makes sure this only works on your own row.
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim(), passport_country: passport })
      .eq("id", userId);
    if (error) return setMessage(error.message);
    router.push("/");
    router.refresh();
  }

  const field = "w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Passport country
        <select className={field} value={passport} onChange={(e) => setPassport(e.target.value)}>
          <option value="">Choose a country</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </label>
      <button className="cursor-pointer rounded bg-black px-3 py-2 text-white transition hover:bg-zinc-700 active:scale-[0.98] active:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:bg-white dark:text-black dark:hover:bg-zinc-300 dark:active:bg-zinc-400">
        Save profile
      </button>
      {message && <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>}
    </form>
  );
}
