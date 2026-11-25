"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Compass, Globe2, Heart, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error(error.message);
      router.push("/");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo() },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        toast.success("Check your email to confirm your account.");
      }
    }
  }

  async function magicLink() {
    if (!email) return toast.error("Enter your email first.");
    setLinkBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    setLinkBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for a sign-in link.");
  }

  async function google() {
    setGoogleBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    // On success the browser leaves for Google, so keep the spinner until then.
    if (error) {
      setGoogleBusy(false);
      toast.error(error.message);
    }
  }

  const features = [
    { icon: Globe2, text: "Keep a diary of every place you've been" },
    { icon: Heart, text: "Build a wishlist and tick places off as you go" },
    { icon: Users, text: "Plan group trips and see where everyone has been" },
  ];

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <Compass className="size-5" aria-hidden />
          </span>
          <span className="font-heading text-xl font-semibold">Travel Diary</span>
        </div>
        <div>
          <h2 className="font-heading max-w-md text-4xl leading-tight font-semibold">
            Every journey, together in one place.
          </h2>
          <ul className="mt-8 flex flex-col gap-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-primary-foreground/90">
                <Icon className="size-5 shrink-0" aria-hidden /> {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-primary-foreground/70">Plan it. Log it. Share it.</p>
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full border border-primary-foreground/10" />
        <div aria-hidden className="pointer-events-none absolute -right-8 -bottom-8 size-64 rounded-full border border-primary-foreground/10" />
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Compass className="size-4.5" aria-hidden />
            </span>
            <span className="font-heading text-lg font-semibold">Travel Diary</span>
          </div>

          <h1 className="text-3xl font-semibold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {mode === "signin" ? "Sign in to your travel diary." : "Start logging your travels."}
          </p>

          <Button variant="outline" size="lg" className="mt-6 w-full" loading={googleBusy} onClick={google}>
            <GoogleIcon /> Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" /> or with email <Separator className="flex-1" />
          </div>

          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" size="lg" loading={busy}>
              {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <Button variant="ghost" className="mt-2 w-full" loading={linkBusy} onClick={magicLink}>
            Email me a sign-in link instead
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
