-- Trip photos.
-- The image files live in Supabase Storage. The database only keeps a row that says
-- "this file belongs to this trip".

-- 1. The bucket (a folder-like container for files).
-- private: nobody can open a file just by knowing its URL. The app asks for a
-- short-lived "signed URL", and Storage only hands one out if the RLS policies below allow it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-photos',
  'trip-photos',
  false,
  5242880,  -- 5 MB per file, enforced by Storage itself
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- 2. The table linking files to trips.
-- Files are stored at:  <user id>/<trip id>/<random name>.<ext>
create table public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index trip_photos_trip_id_idx on public.trip_photos (trip_id);

alter table public.trip_photos enable row level security;

create policy "Read your own photos and those of people in your group trips"
  on public.trip_photos for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_group_trip_with(user_id));

-- You can only attach a photo to one of YOUR trips, using YOUR folder.
create policy "Add photos to your own trips"
  on public.trip_photos for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.trips t
      where t.id = trip_id and t.user_id = (select auth.uid())
    )
    and storage_path like (select auth.uid())::text || '/' || trip_id::text || '/%'
  );

create policy "Delete your own photos"
  on public.trip_photos for delete to authenticated
  using (user_id = (select auth.uid()));

-- Limit: at most 10 photos per trip. A trigger runs before each insert and can refuse it.
create function public.limit_photos_per_trip()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.trip_photos where trip_id = new.trip_id) >= 10 then
    raise exception 'A trip can have at most 10 photos';
  end if;
  return new;
end;
$$;

create trigger trip_photos_limit
  before insert on public.trip_photos
  for each row execute function public.limit_photos_per_trip();

-- 3. Rules for the files themselves (the storage.objects table).
-- The first folder in the path is the owner's user id.
-- Folder names come from the client, so we parse them safely: a malformed name must
-- give "no access", not a crash.
create function public.can_view_photo_folder(p_folder text)
returns boolean
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if p_folder = (select auth.uid())::text then
    return true;
  end if;
  if p_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return public.shares_group_trip_with(p_folder::uuid);
  end if;
  return false;
end;
$$;

create policy "View your own photo files and those of people in your group trips"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'trip-photos'
    and public.can_view_photo_folder((storage.foldername(name))[1])
  );

create policy "Upload photo files into your own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trip-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Delete photo files from your own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'trip-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
