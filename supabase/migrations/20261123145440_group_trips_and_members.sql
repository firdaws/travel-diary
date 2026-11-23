-- Group trips and members.
-- A group trip is a private group. Only its members can see it, and through it
-- they can see each other's personal trips and wishlists.

create type public.group_trip_role as enum ('owner', 'member');

create table public.group_trips (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  -- default auth.uid() = "whoever is signed in", so the app doesn't have to send it
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- per-group-trip colors, e.g. {"primary": "#0F6E56"}
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.group_trip_members (
  group_trip_id uuid not null references public.group_trips (id) on delete cascade,
  -- points at profiles (not auth.users) so the app can fetch a member's name in one query
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.group_trip_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_trip_id, user_id)
);

create index group_trip_members_user_id_idx on public.group_trip_members (user_id);

-- Helper functions for RLS.
-- Why not query group_trip_members directly inside its own policy? That would make the
-- policy call itself forever. "security definer" runs the check with the function
-- owner's rights, which skips RLS and avoids the loop.
create function public.is_group_trip_member(p_group_trip_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_trip_members
    where group_trip_id = p_group_trip_id and user_id = (select auth.uid())
  );
$$;

create function public.is_group_trip_owner(p_group_trip_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_trip_members
    where group_trip_id = p_group_trip_id and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

-- True when you and p_user_id are together in at least one group trip.
-- Used to let members read each other's profiles, trips and wishlists.
create function public.shares_group_trip_with(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_trip_members mine
    join public.group_trip_members theirs on theirs.group_trip_id = mine.group_trip_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;

-- Used only by the invite Edge Function (service role). Nobody else may call it,
-- otherwise anyone could look up who has an account.
create function public.find_user_id_by_email(p_email text)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(p_email);
$$;

revoke execute on function public.find_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;

-- When a group trip is created, make its creator the owner member automatically.
create function public.add_owner_as_member()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.group_trip_members (group_trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_group_trip_created
  after insert on public.group_trips
  for each row execute function public.add_owner_as_member();

-- RLS
alter table public.group_trips enable row level security;
alter table public.group_trip_members enable row level security;

create policy "Members can read their group trips"
  on public.group_trips for select to authenticated
  using (public.is_group_trip_member(id));

create policy "Anyone signed in can create a group trip they own"
  on public.group_trips for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners can update their group trip"
  on public.group_trips for update to authenticated
  using (public.is_group_trip_owner(id))
  with check (owner_id = (select auth.uid()));

create policy "Owners can delete their group trip"
  on public.group_trips for delete to authenticated
  using (public.is_group_trip_owner(id));

create policy "Members can see who is in their group trip"
  on public.group_trip_members for select to authenticated
  using (public.is_group_trip_member(group_trip_id));

-- Owners remove anyone but themselves; members can leave. Nobody can remove the owner.
create policy "Owners remove members, members can leave"
  on public.group_trip_members for delete to authenticated
  using (
    role <> 'owner'
    and (public.is_group_trip_owner(group_trip_id) or user_id = (select auth.uid()))
  );

-- No insert/update policy on group_trip_members: adding members only happens through
-- the owner trigger above and the invite Edge Function, never straight from the browser.

-- Let members read the profiles (name, passport) of people they share a group trip with.
create policy "Members can read profiles of people in their group trips"
  on public.profiles for select to authenticated
  using (public.shares_group_trip_with(id));
