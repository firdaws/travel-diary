-- Unread chat tracking.
-- Each membership remembers when that member last read the chat. A message is "unread" for
-- you if someone else sent it after that moment. New members start "caught up": messages
-- sent before they joined are not unread.

alter table public.group_trip_members
  add column chat_read_at timestamptz not null default now();

-- Members have no update policy on group_trip_members (so nobody can change roles from the
-- browser). This function is the one narrow door: it only touches YOUR OWN row, only this column.
create function public.mark_chat_read(p_group_trip_id uuid)
returns void
language sql security definer
set search_path = ''
as $$
  update public.group_trip_members
  set chat_read_at = now()
  where group_trip_id = p_group_trip_id and user_id = (select auth.uid());
$$;

-- How many unread messages do I have in each of my group trips? Groups with none are omitted.
-- Runs as the caller, so RLS still applies: you only ever count chats you can read.
create function public.unread_chat_counts()
returns table (group_trip_id uuid, unread bigint)
language sql stable
set search_path = ''
as $$
  select m.group_trip_id, count(*) as unread
  from public.group_trip_members m
  join public.group_trip_messages msg on msg.group_trip_id = m.group_trip_id
  where m.user_id = (select auth.uid())
    and msg.user_id <> (select auth.uid())
    and msg.created_at > m.chat_read_at
  group by m.group_trip_id;
$$;

-- Only signed-in users may call these (by default functions are open to everyone).
revoke execute on function public.mark_chat_read(uuid) from public, anon;
grant execute on function public.mark_chat_read(uuid) to authenticated;
revoke execute on function public.unread_chat_counts() from public, anon;
grant execute on function public.unread_chat_counts() to authenticated;
