-- Authenticated song ratings belong to the listener, not to the browser.
-- The former device-level constraint prevented a second account using the
-- same browser from rating a song that an earlier account had rated.

alter table public.track_ratings
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.track_ratings
  add column if not exists username text;

create index if not exists track_ratings_user_id_idx
  on public.track_ratings (user_id);

alter table public.track_ratings
  drop constraint if exists track_ratings_album_ref_track_key_device_id_key;

drop index if exists public.track_ratings_album_ref_track_key_device_id_key;

-- Keep stored keys aligned with the canonical key used by save_track_rating.
update public.track_ratings
set track_key = private.canonical_song_name(coalesce(nullif(track_name, ''), track_key))
where track_key is distinct from private.canonical_song_name(coalesce(nullif(track_name, ''), track_key));

-- Older device-based writes may have left more than one row for the same
-- signed-in listener. Keep the latest rating before adding listener identity.
with ranked as (
  select id,
         row_number() over (
           partition by album_ref, track_key, user_id
           order by created_at desc nulls last, id desc
         ) as position
  from public.track_ratings
  where user_id is not null
)
delete from public.track_ratings rating
using ranked
where rating.id = ranked.id
  and ranked.position > 1;

-- Retain one legacy anonymous rating per device. New ratings still require an
-- authenticated user through public.save_track_rating.
with ranked as (
  select id,
         row_number() over (
           partition by album_ref, track_key, device_id
           order by created_at desc nulls last, id desc
         ) as position
  from public.track_ratings
  where user_id is null
)
delete from public.track_ratings rating
using ranked
where rating.id = ranked.id
  and ranked.position > 1;

create unique index if not exists track_ratings_listener_unique
  on public.track_ratings (album_ref, track_key, user_id)
  where user_id is not null;

create unique index if not exists track_ratings_legacy_device_unique
  on public.track_ratings (album_ref, track_key, device_id)
  where user_id is null;

grant execute on function public.save_track_rating(text, text, text, text, numeric, text, text[]) to authenticated;
grant execute on function public.save_track_rating(text, text, text, text, numeric, text) to authenticated;

notify pgrst, 'reload schema';
