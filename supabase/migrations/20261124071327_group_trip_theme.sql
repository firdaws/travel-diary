-- Per-group-trip theme.
-- The `theme` column already exists (jsonb, default '{}'). Now we say what it may contain.
--
-- A jsonb column accepts anything, so without a rule an owner (or a bug) could store junk.
-- A CHECK constraint makes the database refuse anything but {} or {"preset": "<known name>"}.
-- We use named presets, not free-form colors, because every preset is hand-tuned to keep
-- text readable in light and dark mode. A random color picked by a user could not promise that.
alter table public.group_trips
  add constraint group_trips_theme_check check (
    theme = '{}'::jsonb
    or (
      theme ? 'preset'
      and (theme - 'preset') = '{}'::jsonb
      and theme ->> 'preset' in ('teal', 'ocean', 'sunset', 'forest', 'plum', 'slate')
    )
  );

-- Announce theme changes on the group's live channel too, so other members' pages
-- recolor without a reload. A group trip's own id is its channel id.
create or replace function public.broadcast_group_trip_change()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  j jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  gid uuid;
begin
  if tg_table_name = 'group_trips' then
    perform realtime.broadcast_changes(
      'group_trip:' || (j ->> 'id'), tg_op, tg_op, tg_table_name, tg_table_schema, new, old);
  elsif j ? 'group_trip_id' then
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

create trigger broadcast_group_trips
  after update on public.group_trips
  for each row
  when (old.theme is distinct from new.theme or old.name is distinct from new.name)
  execute function public.broadcast_group_trip_change();
