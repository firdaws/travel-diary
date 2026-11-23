-- "Mark as visited": move a wishlist item into trips as ONE step.
-- A Postgres function runs as a single transaction: either both the delete and the
-- insert happen, or neither does. The browser can't get stuck halfway with the
-- item deleted but no trip created.
--
-- "security invoker" (the default, spelled out here) means the function runs with
-- the caller's rights, so RLS still applies. You can only move your own items.
create function public.mark_wishlist_visited(p_item_id uuid, p_visited_on date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item public.wishlist_items;
  v_trip_id uuid;
begin
  delete from public.wishlist_items
  where id = p_item_id
  returning * into v_item;

  if not found then
    raise exception 'Wishlist item not found';
  end if;

  insert into public.trips (country_code, city, visited_on, notes)
  values (
    v_item.country_code,
    v_item.city,
    date_trunc('month', p_visited_on)::date,  -- keep month and year only
    v_item.notes
  )
  returning id into v_trip_id;

  return v_trip_id;
end;
$$;

-- Only signed-in users may call it.
revoke execute on function public.mark_wishlist_visited(uuid, date) from public, anon;
grant execute on function public.mark_wishlist_visited(uuid, date) to authenticated;
