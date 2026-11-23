"use client";

import { useActionState } from "react";
import { inviteMember, type InviteState } from "../actions";

const field = "w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

export default function InviteForm({ groupTripId }: { groupTripId: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(
    inviteMember.bind(null, groupTripId),
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input className={field} name="name" placeholder="Name" required />
      <input className={field} name="email" type="email" placeholder="name@company.com" required />
      <button
        disabled={pending}
        className="cursor-pointer rounded bg-black px-3 py-2 text-white transition hover:bg-zinc-700 active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-300"
      >
        {pending ? "Sending…" : "Send invite"}
      </button>
      {state && (
        <p className={`text-sm ${state.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
