-- Phase 8: live updates (Realtime) and a webhook for "member added".

-- ============================================================================
-- 1. Activity feed: a log of things that happened in a group trip.
-- ============================================================================
create table public.group_trip_activity (
  id uuid primary key default gen_random_uuid(),
  group_trip_id uuid not null references public.group_trips (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null check (type in ('member_added')),
  created_at timestamptz not null default now()
);

create index group_trip_activity_feed_idx on public.group_trip_activity (group_trip_id, created_at desc);

alter table public.group_trip_activity enable row level security;

-- Members can read it. Nobody can write from the app: only the webhook's Edge Function
-- (service role) adds rows.
create policy "Members can read their group trip activity"
  on public.group_trip_activity for select to authenticated
  using (public.is_group_trip_member(group_trip_id));

-- ============================================================================
-- 2. Realtime: Broadcast from the database.
-- Each group trip has a channel named "group_trip:<id>". Triggers announce changes there.
-- ============================================================================

-- Safely read the group trip id out of a channel name. Bad names give NULL (= no access).
create function public.group_trip_id_from_topic(p_topic text)
returns uuid
language sql immutable
set search_path = ''
as $$
  select case
    when p_topic ~ '^group_trip:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then substr(p_topic, 12)::uuid
  end;
$$;

-- Who may join a channel? RLS on realtime.messages decides.
-- Receiving broadcasts and presence: members of that group trip only.
create policy "Members can listen to their group trip channel"
  on realtime.messages for select to authenticated
  using (
    extension in ('broadcast', 'presence')
    and public.is_group_trip_member(public.group_trip_id_from_topic((select realtime.topic())))
  );

-- Announcing "I'm online" (presence) is allowed for members. There is deliberately NO
-- policy for sending broadcasts: browsers can't post fake updates. Only our triggers can.
create policy "Members can announce presence in their group trip channel"
  on realtime.messages for insert to authenticated
  with check (
    extension = 'presence'
    and public.is_group_trip_member(public.group_trip_id_from_topic((select realtime.topic())))
  );

-- The trigger function. A change to a row is announced on the channel of every group trip
-- that the row's owner belongs to (or on its own group trip, for group-level tables).
create function public.broadcast_group_trip_change()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  j jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  gid uuid;
begin
  if j ? 'group_trip_id' then
    perform realtime.broadcast_changes(
      'group_trip:' || (j ->> 'group_trip_id'), tg_op, tg_op, tg_table_name, tg_table_schema, new, old);
  else
    for gid in
      select group_trip_id from public.group_trip_members where user_id = (j ->> 'user_id')::uuid
    loop
      perform realtime.broadcast_changes(
        'group_trip:' || gid, tg_op, tg_op, tg_table_name, tg_table_schema, new, old);
    end loop;
  end if;
  return null;
end;
$$;

create trigger broadcast_trips
  after insert or update or delete on public.trips
  for each row execute function public.broadcast_group_trip_change();

create trigger broadcast_wishlist_items
  after insert or update or delete on public.wishlist_items
  for each row execute function public.broadcast_group_trip_change();

create trigger broadcast_trip_photos
  after insert or delete on public.trip_photos
  for each row execute function public.broadcast_group_trip_change();

create trigger broadcast_group_trip_members
  after insert or delete on public.group_trip_members
  for each row execute function public.broadcast_group_trip_change();

create trigger broadcast_group_trip_activity
  after insert on public.group_trip_activity
  for each row execute function public.broadcast_group_trip_change();

-- ============================================================================
-- 3. Database webhook: when a member is added, call an Edge Function.
-- A "database webhook" is just a trigger that makes an HTTP request using the pg_net
-- extension. The request is queued and sent in the background, so it never slows down
-- or blocks the insert.
-- ============================================================================
create extension if not exists pg_net;

-- The URL and secret differ per environment (local vs production), so they live in
-- Supabase Vault (encrypted secrets), not in this file. The README/plan says how to set them.
-- If they aren't set, the trigger quietly does nothing.
create function public.notify_member_added()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  base_url text;
  secret text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'webhook_base_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'webhook_secret';
  if base_url is null or secret is null then
    return new;
  end if;

  perform net.http_post(
    url := base_url || '/functions/v1/member-joined',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', secret),
    body := jsonb_build_object(
      'type', tg_op, 'table', tg_table_name, 'schema', tg_table_schema, 'record', to_jsonb(new)
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

-- Only for people who are added, not for the owner row created with the group trip.
create trigger webhook_member_added
  after insert on public.group_trip_members
  for each row
  when (new.role <> 'owner')
  execute function public.notify_member_added();
