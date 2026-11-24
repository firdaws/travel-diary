-- Group trip chat.
-- A message belongs to one group trip and one sender. Only members of that group trip can
-- read it, and you can only post as yourself. Messages are announced live on the group
-- trip's existing realtime channel ("group_trip:<id>"), the same one used for places.

create table public.group_trip_messages (
  id uuid primary key default gen_random_uuid(),
  group_trip_id uuid not null references public.group_trips (id) on delete cascade,
  -- default auth.uid(): the browser never has to say who is sending.
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- The chat always loads "the latest messages of one group trip".
create index group_trip_messages_group_created_idx
  on public.group_trip_messages (group_trip_id, created_at desc);

alter table public.group_trip_messages enable row level security;

create policy "Members can read their group trip chat"
  on public.group_trip_messages for select to authenticated
  using (public.is_group_trip_member(group_trip_id));

create policy "Members can post to their group trip chat as themselves"
  on public.group_trip_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_group_trip_member(group_trip_id)
  );

-- You can delete your own messages, and only while you are still a member.
create policy "Members can delete their own chat messages"
  on public.group_trip_messages for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_group_trip_member(group_trip_id)
  );

-- No update policy: messages can't be edited.

-- Announce new and deleted messages on the group trip's channel.
-- broadcast_group_trip_change() already knows how to route rows that have a group_trip_id.
create trigger broadcast_group_trip_messages
  after insert or delete on public.group_trip_messages
  for each row execute function public.broadcast_group_trip_change();
