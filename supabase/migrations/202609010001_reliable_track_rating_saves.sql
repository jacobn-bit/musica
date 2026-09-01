-- Persist one song rating per authenticated listener and keep the public
-- aggregate trigger as the single source of truth for community counts.

create or replace function public.save_track_rating(
  p_album_ref text,
  p_track_key text,
  p_track_name text,
  p_device_id text,
  p_rating integer,
  p_username text
)
returns table (
  album_ref text,
  track_key text,
  track_name text,
  rating integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_track_key text := lower(trim(coalesce(nullif(p_track_name, ''), p_track_key)));
  v_rating_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to rate a song.' using errcode = '42501';
  end if;
  if nullif(trim(p_album_ref), '') is null or nullif(v_track_key, '') is null then
    raise exception 'Album and song are required.' using errcode = '22023';
  end if;
  if p_rating < 1 or p_rating > 10 then
    raise exception 'Song rating must be between 1 and 10.' using errcode = '22023';
  end if;

  -- Prefer an existing rating owned by this account. A legacy device-only row
  -- can be claimed by the signed-in account that created it.
  select row.id into v_rating_id
  from public.track_ratings row
  where row.album_ref = p_album_ref
    and lower(trim(row.track_name)) = v_track_key
    and (
      row.user_id = v_user_id
      or (row.user_id is null and row.device_id = p_device_id)
    )
  order by (row.user_id = v_user_id) desc, row.created_at desc
  limit 1;

  if v_rating_id is null then
    insert into public.track_ratings (
      album_ref, track_key, track_name, device_id, user_id, rating, username
    ) values (
      p_album_ref, v_track_key, p_track_name, p_device_id, v_user_id, p_rating,
      coalesce(nullif(trim(p_username), ''), nullif(auth.jwt() ->> 'user_name', ''), nullif(auth.jwt() ->> 'preferred_username', ''), 'Listener')
    )
    returning id into v_rating_id;
  else
    update public.track_ratings row
    set track_key = v_track_key,
        track_name = p_track_name,
        device_id = p_device_id,
        user_id = v_user_id,
        rating = p_rating,
        username = coalesce(nullif(trim(p_username), ''), row.username, 'Listener')
    where row.id = v_rating_id;
  end if;

  return query
  select row.album_ref, row.track_key, row.track_name, row.rating
  from public.track_ratings row
  where row.id = v_rating_id;
end;
$$;

revoke all on function public.save_track_rating(text, text, text, text, integer, text) from public, anon;
grant execute on function public.save_track_rating(text, text, text, text, integer, text) to authenticated;

notify pgrst, 'reload schema';
