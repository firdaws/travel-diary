-- When you insert a group trip and ask for the row back, Postgres checks the read policy
-- using a snapshot taken before our trigger added the owner as a member. So
-- "is_group_trip_member" is still false at that moment. Checking owner_id directly fixes it.
drop policy "Members can read their group trips" on public.group_trips;

create policy "Members and owners can read their group trips"
  on public.group_trips for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_group_trip_member(id));
