// A small red dot meaning "unread chat messages here". Shown on group trips only.
export default function UnreadDot({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span
      role="img"
      aria-label={`${count} unread ${count === 1 ? "message" : "messages"}`}
      className="size-2.5 shrink-0 rounded-full bg-destructive"
    />
  );
}
