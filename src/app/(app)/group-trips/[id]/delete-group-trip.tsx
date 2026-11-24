"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteGroupTrip } from "../actions";

// Two clicks on purpose: the first asks, the second deletes.
export default function DeleteGroupTrip({ groupTripId }: { groupTripId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        Delete group trip
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="destructive"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await deleteGroupTrip(groupTripId);
            } catch (e) {
              // A redirect also throws in Next.js; let it through.
              if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
              toast.error(e instanceof Error ? e.message : "Couldn't delete.");
              setConfirming(false);
            }
          })
        }
      >
        {pending ? "Deleting…" : "Yes, delete it"}
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
