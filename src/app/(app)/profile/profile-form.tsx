"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export default function ProfileForm({
  userId,
  initialName,
  initialPassport,
  countries,
  firstTime,
}: {
  userId: string;
  initialName: string;
  initialPassport: string;
  countries: { code: string; name: string }[];
  firstTime: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(initialName);
  const [passport, setPassport] = useState(initialPassport);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Enter your name.");
    if (!passport) return toast.error("Choose your passport country.");
    setSaving(true);
    // RLS makes sure this only works on your own row.
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim(), passport_country: passport })
      .eq("id", userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    if (firstTime) router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="passport">Passport country</Label>
        <NativeSelect id="passport" value={passport} onChange={(e) => setPassport(e.target.value)} required>
          <option value="" disabled>Choose a country</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </NativeSelect>
      </div>
      <div>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving…" : firstTime ? "Save and continue" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
