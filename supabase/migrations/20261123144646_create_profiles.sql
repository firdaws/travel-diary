-- Profiles: one row per user, holding the app-level info Auth doesn't store.
-- auth.users is managed by Supabase Auth. We never edit it; we link to it.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  -- ISO 3166-1 alpha-2 code, e.g. 'KE'. Nullable until the user sets it.
  -- A foreign key to the countries table is added in phase 3.
  passport_country char(2) check (passport_country ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now()
);

-- RLS (row-level security): with it on and no policy, nobody can read or write.
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Trigger: when someone signs up, automatically create their profile row.
-- "security definer" lets the function write even though the new user
-- has no insert policy. Empty search_path is a safety best practice.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
