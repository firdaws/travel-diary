-- An owner may delete a group trip only once nobody else is left in it.
-- This is enforced in the database, so no client (or bug) can skip the rule.

-- True when the group trip has exactly one member (the owner).
create function public.is_group_trip_sole_member(p_group_trip_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select count(*) = 1 from public.group_trip_members where group_trip_id = p_group_trip_id;
$$;

drop policy "Owners can delete their group trip" on public.group_trips;

create policy "Owners can delete their group trip once alone in it"
  on public.group_trips for delete to authenticated
  using (public.is_group_trip_owner(id) and public.is_group_trip_sole_member(id));
