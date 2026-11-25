"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// On pages that list group trips: when someone else posts a chat message in any of your
// group trips, refresh so the red dot appears without a reload.
export default function UnreadLive({ groupTripIds, userId }: { groupTripIds: string[]; userId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = groupTripIds.join(",");

  useEffect(() => {
    const supabase = createClient();
    const channels: ReturnType<typeof supabase.channel>[] = [];
    let cancelled = false;

    async function connect() {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      for (const id of key ? key.split(",") : []) {
        const channel = supabase
          .channel(`group_trip:${id}`, { config: { private: true } })
          .on("broadcast", { event: "INSERT" }, ({ payload }) => {
            if (payload?.table !== "group_trip_messages" || payload?.record?.user_id === userId) return;
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => router.refresh(), 300);
          })
          .subscribe();
        channels.push(channel);
      }
    }
    connect();

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [key, userId, router]);

  return null;
}
