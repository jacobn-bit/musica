-- Remove SECURITY DEFINER views from the public Muze read path without
-- exposing the listener identity columns stored in the raw rating tables.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.album_score_aggregates (
  album_id uuid primary key references public.albums(id) on delete cascade,
  avg_rating numeric not null default 0,
  ratings_count integer not null default 0 check (ratings_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.song_score_aggregates (
  album_ref text not null,
  track_key text not null,
  track_name text not null,
  avg_rating numeric not null default 0,
  ratings_count integer not null default 0 check (ratings_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (album_ref, track_key)
);

alter table public.album_score_aggregates enable row level security;
alter table public.song_score_aggregates enable row level security;

drop policy if exists "Public can read album score aggregates" on public.album_score_aggregates;
create policy "Public can read album score aggregates"
on public.album_score_aggregates for select
to anon, authenticated
using (true);

drop policy if exists "Public can read song score aggregates" on public.song_score_aggregates;
create policy "Public can read song score aggregates"
on public.song_score_aggregates for select
to anon, authenticated
using (true);

revoke all on table public.album_score_aggregates from anon, authenticated;
revoke all on table public.song_score_aggregates from anon, authenticated;
grant select on table public.album_score_aggregates to anon, authenticated;
grant select on table public.song_score_aggregates to anon, authenticated;

insert into public.album_score_aggregates (album_id, avg_rating, ratings_count, updated_at)
select
  album_id,
  round(avg(rating)::numeric, 1),
  count(rating)::integer,
  now()
from public.ratings
where album_id is not null
group by album_id
on conflict (album_id) do update set
  avg_rating = excluded.avg_rating,
  ratings_count = excluded.ratings_count,
  updated_at = excluded.updated_at;

delete from public.album_score_aggregates aggregate_row
where not exists (
  select 1 from public.ratings rating_row
  where rating_row.album_id = aggregate_row.album_id
);

insert into public.song_score_aggregates (album_ref, track_key, track_name, avg_rating, ratings_count, updated_at)
select
  album_ref,
  track_key,
  max(track_name),
  round(avg(rating)::numeric, 1),
  count(rating)::integer,
  now()
from public.track_ratings
group by album_ref, track_key
on conflict (album_ref, track_key) do update set
  track_name = excluded.track_name,
  avg_rating = excluded.avg_rating,
  ratings_count = excluded.ratings_count,
  updated_at = excluded.updated_at;

delete from public.song_score_aggregates aggregate_row
where not exists (
  select 1 from public.track_ratings rating_row
  where rating_row.album_ref = aggregate_row.album_ref
    and rating_row.track_key = aggregate_row.track_key
);

create or replace function private.refresh_album_score_aggregate(p_album_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_album_id is null then return; end if;

  insert into public.album_score_aggregates (album_id, avg_rating, ratings_count, updated_at)
  select
    p_album_id,
    round(avg(rating)::numeric, 1),
    count(rating)::integer,
    now()
  from public.ratings
  where album_id = p_album_id
  having count(rating) > 0
  on conflict (album_id) do update set
    avg_rating = excluded.avg_rating,
    ratings_count = excluded.ratings_count,
    updated_at = excluded.updated_at;

  if not found then
    delete from public.album_score_aggregates where album_id = p_album_id;
  end if;
end;
$$;

create or replace function private.sync_album_score_aggregate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.refresh_album_score_aggregate(new.album_id);
  elsif tg_op = 'DELETE' then
    perform private.refresh_album_score_aggregate(old.album_id);
  else
    if old.album_id is distinct from new.album_id then
      perform private.refresh_album_score_aggregate(old.album_id);
    end if;
    perform private.refresh_album_score_aggregate(new.album_id);
  end if;
  return null;
end;
$$;

create or replace function private.refresh_song_score_aggregate(p_album_ref text, p_track_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_album_ref is null or p_track_key is null then return; end if;

  insert into public.song_score_aggregates (album_ref, track_key, track_name, avg_rating, ratings_count, updated_at)
  select
    p_album_ref,
    p_track_key,
    max(track_name),
    round(avg(rating)::numeric, 1),
    count(rating)::integer,
    now()
  from public.track_ratings
  where album_ref = p_album_ref and track_key = p_track_key
  having count(rating) > 0
  on conflict (album_ref, track_key) do update set
    track_name = excluded.track_name,
    avg_rating = excluded.avg_rating,
    ratings_count = excluded.ratings_count,
    updated_at = excluded.updated_at;

  if not found then
    delete from public.song_score_aggregates
    where album_ref = p_album_ref and track_key = p_track_key;
  end if;
end;
$$;

create or replace function private.sync_song_score_aggregate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.refresh_song_score_aggregate(new.album_ref, new.track_key);
  elsif tg_op = 'DELETE' then
    perform private.refresh_song_score_aggregate(old.album_ref, old.track_key);
  else
    if (old.album_ref, old.track_key) is distinct from (new.album_ref, new.track_key) then
      perform private.refresh_song_score_aggregate(old.album_ref, old.track_key);
    end if;
    perform private.refresh_song_score_aggregate(new.album_ref, new.track_key);
  end if;
  return null;
end;
$$;

revoke all on function private.refresh_album_score_aggregate(uuid) from public, anon, authenticated;
revoke all on function private.sync_album_score_aggregate() from public, anon, authenticated;
revoke all on function private.refresh_song_score_aggregate(text, text) from public, anon, authenticated;
revoke all on function private.sync_song_score_aggregate() from public, anon, authenticated;

drop trigger if exists ratings_refresh_public_aggregate on public.ratings;
create trigger ratings_refresh_public_aggregate
after insert or update or delete on public.ratings
for each row execute function private.sync_album_score_aggregate();

drop trigger if exists track_ratings_refresh_public_aggregate on public.track_ratings;
create trigger track_ratings_refresh_public_aggregate
after insert or update or delete on public.track_ratings
for each row execute function private.sync_song_score_aggregate();

create or replace view public.album_scores
with (security_invoker = true)
as
select
  album.id,
  album.title,
  album.artist,
  album.year,
  album.genre,
  album.cover_url,
  album.spotify_url,
  album.summary,
  album.spotify_id,
  coalesce(score.avg_rating, 0) as avg_rating,
  coalesce(score.ratings_count, 0)::integer as ratings_count
from public.albums album
left join public.album_score_aggregates score on score.album_id = album.id;

create or replace view public.song_scores
with (security_invoker = true)
as
select
  album_ref,
  track_key,
  track_name,
  avg_rating,
  ratings_count
from public.song_score_aggregates;

alter view public.library_feed set (security_invoker = true);

grant select on public.album_scores to anon, authenticated;
grant select on public.song_scores to anon, authenticated;
grant select on public.library_feed to anon, authenticated;

notify pgrst, 'reload schema';
