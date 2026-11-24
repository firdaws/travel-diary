"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CHAT_EVENT } from "@/components/group-chat";

type Member = { user_id: string; name: string };
type Online = { id: string; name: string };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Keeps the group trip page live:
//  - Broadcast: the database announces every change on a private channel "group_trip:<id>".
//    We show a toast and refresh the page data.
//  - Presence: shows which members have this page open right now.
// Who may join the channel is decided by RLS on realtime.messages, so only members can.
export default function GroupLive({
  groupTripId,
  userId,
  userName,
  members,
}: {
  groupTripId: string;
  userId: string;
  userName: string;
  members: Member[];
}) {
  const router = useRouter();
  const [online, setOnline] = useState<Online[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep the latest member list without re-subscribing every time it changes.
  const membersRef = useRef(members);
  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // Several changes can arrive at once (e.g. 3 photos). Refresh once, shortly after the last.
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };

    const nameOf = (id?: string) => membersRef.current.find((m) => m.user_id === id)?.name || "Someone";

    async function connect() {
      await supabase.realtime.setAuth(); // private channels need your login token
      if (cancelled) return;

      channel = supabase.channel(`group_trip:${groupTripId}`, {
        config: { private: true, presence: { key: userId } },
      });

      channel
        .on("broadcast", { event: "*" }, async ({ event, payload }) => {
          const row = payload?.record ?? {};
          const mine = row.user_id === userId;
          const table = payload?.table as string;

          // Chat messages go straight to the chat box. No toast, no page refresh.
          if (table === "group_trip_messages") {
            window.dispatchEvent(new CustomEvent(CHAT_EVENT, { detail: { event, row } }));
            return;
          }

          // Only the owner can change the theme, so skip the toast for their own change.
          if (table === "group_trips" && event === "UPDATE" && row.owner_id !== userId) {
            toast("This group trip's look was updated");
          }

          if (event === "INSERT" && !mine) {
            if (table === "trips") toast(`${nameOf(row.user_id)} added a place they've visited`);
            if (table === "wishlist_items") toast(`${nameOf(row.user_id)} added a place to their wishlist`);
            if (table === "group_trip_members") {
              // The new member's name isn't in our list yet, so ask for it.
              const { data } = await supabase.from("profiles").select("name").eq("id", row.user_id).single();
              toast(`${data?.name || "Someone"} was added to the group trip`);
            }
          }
          refresh();
        })
        .on("presence", { event: "sync" }, () => {
          const state = channel!.presenceState<{ name: string }>();
          setOnline(Object.entries(state).map(([id, metas]) => ({ id, name: metas[0]?.name ?? "Someone" })));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") await channel!.track({ name: userName });
        });
    }

    connect();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [groupTripId, userId, userName, router]);

  if (online.length === 0) return null;

  return (
    <div className="flex items-center gap-2" aria-label={`${online.length} online now`}>
      <div className="flex -space-x-2">
        {online.map((o) => (
          <Avatar key={o.id} className="size-7 ring-2 ring-background" title={o.id === userId ? "You" : o.name}>
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">{initials(o.name)}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-green-500" aria-hidden /> {online.length} online
      </span>
    </div>
  );
}
