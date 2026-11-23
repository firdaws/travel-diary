-- Personal lists. Every row belongs to ONE user.
-- Group trips don't copy anything: a group trip view simply reads its members' rows.
-- Visibility rule: you can read a row if it's yours, or if you share a group trip
-- with its owner. Only the owner can change it.

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- ISO alpha-2 code. A foreign key to the countries table is added when we seed it.
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 120),
  -- Month and year only: stored as the first day of that month.
  visited_on date not null check (extract(day from visited_on) = 1),
  notes text check (char_length(notes) <= 5000),
  created_at timestamptz not null default now()
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 120),
  -- Optional target month and year (first day of the month).
  target_on date check (extract(day from target_on) = 1),
  notes text check (char_length(notes) <= 5000),
  created_at timestamptz not null default now()
);

create index trips_user_id_idx on public.trips (user_id);
create index wishlist_items_user_id_idx on public.wishlist_items (user_id);

alter table public.trips enable row level security;
alter table public.wishlist_items enable row level security;

create policy "Read your own trips and those of people in your group trips"
  on public.trips for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_group_trip_with(user_id));

create policy "Add your own trips"
  on public.trips for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Edit your own trips"
  on public.trips for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Delete your own trips"
  on public.trips for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Read your own wishlist and that of people in your group trips"
  on public.wishlist_items for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_group_trip_with(user_id));

create policy "Add to your own wishlist"
  on public.wishlist_items for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Edit your own wishlist"
  on public.wishlist_items for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Delete from your own wishlist"
  on public.wishlist_items for delete to authenticated
  using (user_id = (select auth.uid()));
