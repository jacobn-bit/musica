
-- Run this in Supabase SQL Editor

create table if not exists albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  year int,
  genre text,
  cover_url text,
  spotify_url text,
  summary text,
  created_at timestamptz default now()
);

alter table albums add column if not exists spotify_id text;

create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references albums(id) on delete cascade,
  device_id text not null,
  rating int not null check (rating between 1 and 10),
  created_at timestamptz default now(),
  unique(album_id, device_id)
);

create or replace view album_scores as
select
  a.id,
  a.title,
  a.artist,
  a.year,
  a.genre,
  a.cover_url,
  a.spotify_url,
  a.summary,
  a.spotify_id,
  coalesce(round(avg(r.rating)::numeric, 1), 0) as avg_rating,
  count(r.rating)::int as ratings_count
from albums a
left join ratings r on r.album_id = a.id
group by a.id;

alter table albums enable row level security;
alter table ratings enable row level security;

drop policy if exists "Anyone can read albums" on albums;
create policy "Anyone can read albums" on albums for select using (true);

drop policy if exists "Anyone can add albums" on albums;
create policy "Anyone can add albums" on albums for insert with check (true);

drop policy if exists "Anyone can read ratings" on ratings;
create policy "Anyone can read ratings" on ratings for select using (true);

drop policy if exists "Anyone can add ratings" on ratings;
create policy "Anyone can add ratings" on ratings for insert with check (true);

drop policy if exists "Anyone can update ratings" on ratings;
create policy "Anyone can update ratings" on ratings for update using (true);


-- Comments and per-song ratings
alter table albums add column if not exists spotify_id text;

create table if not exists album_comments (
  id uuid primary key default gen_random_uuid(),
  album_ref text not null,
  device_id text not null,
  name text not null default 'Listener',
  comment text not null,
  created_at timestamptz default now()
);

create table if not exists track_ratings (
  id uuid primary key default gen_random_uuid(),
  album_ref text not null,
  track_key text not null,
  track_name text not null,
  device_id text not null,
  rating int not null check (rating between 1 and 10),
  created_at timestamptz default now(),
  unique(album_ref, track_key, device_id)
);

alter table album_comments enable row level security;
alter table track_ratings enable row level security;

drop policy if exists "Anyone can read album comments" on album_comments;
create policy "Anyone can read album comments" on album_comments for select using (true);

drop policy if exists "Anyone can add album comments" on album_comments;
create policy "Anyone can add album comments" on album_comments for insert with check (true);

drop policy if exists "Anyone can read track ratings" on track_ratings;
create policy "Anyone can read track ratings" on track_ratings for select using (true);

drop policy if exists "Anyone can add track ratings" on track_ratings;
create policy "Anyone can add track ratings" on track_ratings for insert with check (true);

drop policy if exists "Anyone can update track ratings" on track_ratings;
create policy "Anyone can update track ratings" on track_ratings for update using (true);




-- Delete support for accidental duplicate albums
drop policy if exists "Anyone can delete albums" on albums;
create policy "Anyone can delete albums" on albums for delete using (true);

drop policy if exists "Anyone can delete album comments" on album_comments;
create policy "Anyone can delete album comments" on album_comments for delete using (true);

drop policy if exists "Anyone can delete track ratings" on track_ratings;
create policy "Anyone can delete track ratings" on track_ratings for delete using (true);


-- Per-song comments
create table if not exists track_comments (
  id uuid primary key default gen_random_uuid(),
  album_ref text not null,
  track_key text not null,
  track_name text not null,
  device_id text not null,
  name text not null default 'Listener',
  comment text not null,
  created_at timestamptz default now()
);

alter table track_comments enable row level security;

drop policy if exists "Anyone can read track comments" on track_comments;
create policy "Anyone can read track comments" on track_comments for select using (true);

drop policy if exists "Anyone can add track comments" on track_comments;
create policy "Anyone can add track comments" on track_comments for insert with check (true);

drop policy if exists "Anyone can delete track comments" on track_comments;
create policy "Anyone can delete track comments" on track_comments for delete using (true);
