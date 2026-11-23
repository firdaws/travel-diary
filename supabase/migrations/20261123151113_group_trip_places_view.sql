-- One row per (group trip, member, place). Visited places and wishlist items are
-- stacked into a single list, so the group page needs just one query.
--
-- A view is a saved query that looks like a table. It stores no data of its own.
--
-- "security_invoker = true" is the important line. Without it a view runs with its
-- creator's rights and would skip RLS, leaking everyone's data. With it, the view
-- runs as whoever asks, so all the RLS rules on group_trip_members, profiles, trips
-- and wishlist_items still apply.
--
-- Because rows come from joining group_trip_members, a person only appears under the
-- group trips they actually belong to. Bob never shows up in a group trip he isn't in,
-- even if you share a different group trip with him.
create view public.group_trip_places
with (security_invoker = true) as
select
  m.group_trip_id,
  m.user_id,
  p.name as member_name,
  'visited'::text as kind,
  t.id as place_id,
  t.country_code,
  c.name as country_name,
  t.city,
  t.visited_on as month_on,
  t.notes
from public.group_trip_members m
join public.profiles p on p.id = m.user_id
join public.trips t on t.user_id = m.user_id
join public.countries c on c.code = t.country_code

union all

select
  m.group_trip_id,
  m.user_id,
  p.name,
  'wishlist'::text,
  w.id,
  w.country_code,
  c.name,
  w.city,
  w.target_on,
  w.notes
from public.group_trip_members m
join public.profiles p on p.id = m.user_id
join public.wishlist_items w on w.user_id = m.user_id
join public.countries c on c.code = w.country_code;

-- Only signed-in users may query it (RLS still decides which rows they get).
revoke all on public.group_trip_places from anon;
grant select on public.group_trip_places to authenticated;
