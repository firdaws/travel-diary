"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteMember, type InviteState } from "../actions";

export default function InviteForm({ groupTripId }: { groupTripId: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(
    inviteMember.bind(null, groupTripId),
    null,
  );

  // Show the result as a toast instead of inline text.
  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="invite-name">Name</Label>
        <Input id="invite-name" name="name" required placeholder="Sam" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="invite-email">Email</Label>
        <Input id="invite-email" name="email" type="email" required placeholder="sam@example.com" />
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        <Send /> {pending ? "Sending…" : "Send invite"}
      </Button>
    </form>
  );
}
