-- Song ratings use the same 0.5–10 scale presented by the Muze rating control.

alter table public.track_ratings
  drop constraint if exists track_ratings_rating_check;

alter table public.track_ratings
  alter column rating type numeric(3,1)
  using rating::numeric(3,1);

alter table public.track_ratings
  add constraint track_ratings_rating_check
  check (rating between 0.5 and 10 and rating * 2 = trunc(rating * 2));

-- Replace the integer RPC overloads so PostgREST accepts half-point values.
drop function if exists public.save_track_rating(text, text, text, text, integer, text);
drop function if exists public.save_track_rating(text, text, text, text, integer, text, text[]);

create or replace function public.save_track_rating(
  p_album_ref text,
  p_track_key text,
  p_track_name text,
  p_device_id text,
  p_rating numeric,
  p_username text,
  p_source_album_refs text[]
)
returns table (album_ref text, track_key text, track_name text, rating numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_track_key text := private.canonical_song_name(coalesce(nullif(p_track_name, ''), p_track_key));
  v_rating_id uuid;
  v_source_refs text[] := array(
    select distinct value
    from unnest(coalesce(p_source_album_refs, array[]::text[]) || array[p_album_ref]) value
    where nullif(trim(value), '') is not null
  );
begin
  if v_user_id is null then
    raise exception 'You must be signed in to rate a song.' using errcode = '42501';
  end if;
  if nullif(trim(p_album_ref), '') is null or nullif(v_track_key, '') is null then
    raise exception 'Album and song are required.' using errcode = '22023';
  end if;
  if p_rating is null or p_rating < 0.5 or p_rating > 10 or p_rating * 2 <> trunc(p_rating * 2) then
    raise exception 'Song rating must be from 0.5 to 10 in half-point steps.' using errcode = '22023';
  end if;

  select row.id into v_rating_id
  from public.track_ratings row
  where row.album_ref = any(v_source_refs)
    and private.canonical_song_name(row.track_name) = v_track_key
    and (
      row.user_id = v_user_id
      or (row.user_id is null and row.device_id = p_device_id)
    )
  order by (row.album_ref = p_album_ref) desc, (row.user_id = v_user_id) desc, row.created_at desc
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
    delete from public.track_ratings row
    where row.id <> v_rating_id
      and row.album_ref = any(v_source_refs)
      and private.canonical_song_name(row.track_name) = v_track_key
      and (
        row.user_id = v_user_id
        or (row.user_id is null and row.device_id = p_device_id)
      );

    update public.track_ratings row
    set album_ref = p_album_ref,
        track_key = v_track_key,
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

revoke all on function public.save_track_rating(text, text, text, text, numeric, text, text[]) from public, anon;
grant execute on function public.save_track_rating(text, text, text, text, numeric, text, text[]) to authenticated;

create or replace function public.save_track_rating(
  p_album_ref text,
  p_track_key text,
  p_track_name text,
  p_device_id text,
  p_rating numeric,
  p_username text
)
returns table (album_ref text, track_key text, track_name text, rating numeric)
language sql
security definer
set search_path = ''
as $$
  select * from public.save_track_rating(
    p_album_ref, p_track_key, p_track_name, p_device_id, p_rating, p_username, array[p_album_ref]
  );
$$;

revoke all on function public.save_track_rating(text, text, text, text, numeric, text) from public, anon;
grant execute on function public.save_track_rating(text, text, text, text, numeric, text) to authenticated;

notify pgrst, 'reload schema';
