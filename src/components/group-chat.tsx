"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { timeAgo } from "@/lib/dates";

export type ChatMessage = { id: string; user_id: string; body: string; created_at: string; name: string | null };
type Member = { user_id: string; name: string };

// Event that group-live.tsx re-dispatches for chat rows. We listen here instead of opening a
// second connection to the same channel.
export const CHAT_EVENT = "group-trip-chat";

export default function GroupChat({
  groupTripId,
  userId,
  members,
  initial,
}: {
  groupTripId: string;
  userId: string;
  members: Member[];
  initial: ChatMessage[];
}) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const membersRef = useRef(members);
  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  const nameOf = (id: string) => membersRef.current.find((m) => m.user_id === id)?.name || null;

  // Messages announced by the database: add new ones, drop deleted ones. Ignore duplicates,
  // because we also add our own message as soon as the insert returns.
  useEffect(() => {
    function onChat(e: Event) {
      const { event, row } = (e as CustomEvent).detail as { event: string; row: Record<string, string> };
      if (row.group_trip_id !== groupTripId) return;
      if (event === "INSERT") {
        setMessages((prev) =>
          prev.some((m) => m.id === row.id)
            ? prev
            : [...prev, { id: row.id, user_id: row.user_id, body: row.body, created_at: row.created_at, name: nameOf(row.user_id) }],
        );
      } else if (event === "DELETE") {
        setMessages((prev) => prev.filter((m) => m.id !== row.id));
      }
    }
    window.addEventListener(CHAT_EVENT, onChat);
    return () => window.removeEventListener(CHAT_EVENT, onChat);
  }, [groupTripId]);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const supabase = createClient();
    // RLS checks that you are a member and that the sender is you.
    const { data, error } = await supabase
      .from("group_trip_messages")
      .insert({ group_trip_id: groupTripId, body })
      .select("id, user_id, body, created_at")
      .single();
    setSending(false);
    if (error || !data) {
      toast.error("Couldn't send your message.");
      return;
    }
    setText("");
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, { ...data, name: nameOf(userId) }]));
  }

  async function remove(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase.from("group_trip_messages").delete().eq("id", id).select("id");
    if (error || !data?.length) {
      toast.error("Couldn't delete that message.");
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <ul ref={listRef} className="flex h-72 flex-col gap-2 overflow-y-auto pr-1" aria-live="polite" aria-label="Chat messages">
        {messages.length === 0 && (
          <li className="m-auto text-sm text-muted-foreground">No messages yet. Say hello.</li>
        )}
        {messages.map((m) => {
          const mine = m.user_id === userId;
          return (
            <li key={m.id} className={`group flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <span className="mb-0.5 text-xs text-muted-foreground">
                {mine ? "You" : m.name || "Former member"} · {timeAgo(m.created_at)}
              </span>
              <div className="flex max-w-[85%] items-center gap-1">
                {mine && (
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    aria-label="Delete message"
                    className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
                <p
                  className={`rounded-2xl px-3 py-1.5 text-sm break-words whitespace-pre-wrap ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {m.body}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <form onSubmit={send} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Write a message"
          aria-label="Message"
        />
        <Button type="submit" size="icon" disabled={sending || !text.trim()} aria-label="Send">
          <Send />
        </Button>
      </form>
    </div>
  );
}
