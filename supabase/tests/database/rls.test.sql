-- Row Level Security tests (pgTAP). Run with: supabase test db
-- Everything runs inside a transaction that is rolled back, so nothing is left behind.
begin;
select plan(16);

-- Three users: alice owns a group trip, bob is her member, carol is an outsider.
insert into auth.users (id, email, instance_id, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@test.local',   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000003', 'carol@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

-- Set up data as the superuser (bypasses RLS).
insert into public.group_trips (id, name, owner_id)
  values ('11111111-0000-0000-0000-000000000001', 'Test group', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into public.group_trip_members (group_trip_id, user_id)
  values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002');
insert into public.trips (user_id, country_code, visited_on) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'KE', '2024-01-01'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'FR', '2024-02-01'),
  ('cccccccc-0000-0000-0000-000000000003', 'JP', '2024-03-01');
insert into public.wishlist_items (user_id, country_code) values
  ('cccccccc-0000-0000-0000-000000000003', 'IT');

-- Pretend to be a user, the way the API does.
create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

-- ===== Bob (a member) =====
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');

select results_eq(
  $$ select country_code::text from public.trips order by 1 $$,
  $$ values ('FR'), ('KE') $$,
  'member sees own trips and the owner''s, but not the outsider''s');

select is_empty(
  $$ select 1 from public.wishlist_items $$,
  'member cannot see an outsider''s wishlist');

select is_empty(
  $$ update public.trips set notes = 'hacked' where country_code = 'KE' returning 1 $$,
  'member cannot edit someone else''s trip');

select is_empty(
  $$ delete from public.trips where country_code = 'KE' returning 1 $$,
  'member cannot delete someone else''s trip');

select throws_ok(
  $$ insert into public.trips (user_id, country_code, visited_on)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'DE', '2024-04-01') $$,
  '42501', null, 'member cannot add a trip for someone else');

select is_empty(
  $$ update public.group_trips set name = 'mine now' returning 1 $$,
  'member cannot rename the group trip');

select is_empty(
  $$ update public.group_trips set theme = '{"preset":"plum"}' returning 1 $$,
  'member cannot change the theme');

select isnt_empty(
  $$ select 1 from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'member can read a co-member''s profile');

select is_empty(
  $$ select 1 from public.profiles where id = 'cccccccc-0000-0000-0000-000000000003' $$,
  'member cannot read an outsider''s profile');

-- ===== Carol (outsider) =====
select pg_temp.act_as('cccccccc-0000-0000-0000-000000000003');

select results_eq(
  $$ select country_code::text from public.trips $$,
  $$ values ('JP') $$,
  'outsider sees only own trips');

select is_empty(
  $$ select 1 from public.group_trips $$,
  'outsider cannot see the group trip');

select is_empty(
  $$ select 1 from public.group_trip_members $$,
  'outsider cannot see the member list');

-- ===== Alice (owner) =====
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');

select isnt_empty(
  $$ update public.group_trips set theme = '{"preset":"ocean"}' returning 1 $$,
  'owner can change the theme');

select throws_ok(
  $$ update public.group_trips set theme = '{"primary":"#ff00ff"}' $$,
  '23514', null, 'theme CHECK rejects raw colors');

select throws_ok(
  $$ update public.group_trips set theme = '{"preset":"neon"}' $$,
  '23514', null, 'theme CHECK rejects unknown presets');

-- ===== Not signed in =====
select set_config('role', 'anon', true);
select is_empty(
  $$ select 1 from public.trips $$,
  'signed-out visitors see no trips');

select * from finish();
rollback;
