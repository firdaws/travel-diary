"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const input = "w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";
const button =
  "w-full cursor-pointer rounded bg-black px-3 py-2 text-white transition hover:bg-zinc-700 active:scale-[0.98] active:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:bg-white dark:text-black dark:hover:bg-zinc-300 dark:active:bg-zinc-400";
const ghost =
  "w-full cursor-pointer rounded border border-zinc-300 px-3 py-2 transition hover:bg-zinc-100 active:scale-[0.98] active:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:active:bg-zinc-700";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMessage(error.message);
    router.push("/");
    router.refresh();
  }

  async function signUp() {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) return setMessage(error.message);
    if (data.session) {
      router.push("/");
      router.refresh();
    } else {
      setMessage("Check your email to confirm your account.");
    }
  }

  async function magicLink() {
    if (!email) return setMessage("Enter your email first.");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    setMessage(error ? error.message : "Check your email for a sign-in link.");
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) setMessage(error.message);
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Sign in to Travel Diary</h1>
      <input className={input} type="email" placeholder="name@company.com"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={input} type="password" placeholder="Password"
        value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className={button} onClick={signIn}>Sign in</button>
      <button className={ghost} onClick={signUp}>Create account</button>
      <button className={ghost} onClick={magicLink}>Email me a sign-in link</button>
      <button className={ghost} onClick={google}>Continue with Google</button>
      {message && <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>}
    </main>
  );
}
