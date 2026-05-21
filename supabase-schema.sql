drop view if exists song_scores;
ï»¿
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

-- Authenticated community writes:
-- Public browsing and read access stay open through the select policies above and below.
-- Logged-out users are blocked from ratings, reviews, comments, replies, libraries, and follows.
-- These policy changes preserve existing albums, ratings, reviews, comments, and library data.
drop policy if exists "Anyone can add ratings" on ratings;
drop policy if exists "Authenticated users can add ratings" on ratings;
create policy "Authenticated users can add ratings" on ratings
for insert
to authenticated
with check (true);

drop policy if exists "Anyone can update ratings" on ratings;
drop policy if exists "Authenticated users can update ratings" on ratings;
create policy "Authenticated users can update ratings" on ratings
for update
to authenticated
using (true)
with check (true);


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
drop policy if exists "Authenticated users can add album comments" on album_comments;
create policy "Authenticated users can add album comments" on album_comments
for insert
to authenticated
with check (true);

drop policy if exists "Anyone can read track ratings" on track_ratings;
create policy "Anyone can read track ratings" on track_ratings for select using (true);

drop policy if exists "Anyone can add track ratings" on track_ratings;
drop policy if exists "Authenticated users can add track ratings" on track_ratings;
create policy "Authenticated users can add track ratings" on track_ratings
for insert
to authenticated
with check (true);

drop policy if exists "Anyone can update track ratings" on track_ratings;
drop policy if exists "Authenticated users can update track ratings" on track_ratings;
create policy "Authenticated users can update track ratings" on track_ratings
for update
to authenticated
using (true)
with check (true);




-- Public delete is disabled. Delete albums manually in Supabase, or add an admin-only flow later.

drop policy if exists "Anyone can delete albums" on albums;
drop policy if exists "Anyone can delete album comments" on album_comments;
drop policy if exists "Anyone can delete track ratings" on track_ratings;


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
drop policy if exists "Authenticated users can add track comments" on track_comments;
create policy "Authenticated users can add track comments" on track_comments
for insert
to authenticated
with check (true);

drop policy if exists "Anyone can delete track comments" on track_comments;



-- Aggregated per-song scores
create or replace view song_scores as
select
  album_ref,
  track_key,
  max(track_name) as track_name,
  round(avg(rating)::numeric, 1) as avg_rating,
  count(rating)::int as ratings_count
from track_ratings
group by album_ref, track_key;


-- Store usernames with ratings
alter table ratings add column if not exists username text;
alter table track_ratings add column if not exists username text;


-- Public cannot read raw rating identities; aggregated score views stay public.
drop policy if exists "Anyone can read ratings" on ratings;
drop policy if exists "Anyone can read track ratings" on track_ratings;


-- Public followable user libraries
create table if not exists user_libraries (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  username text not null,
  title text not null,
  items jsonb not null default '[]'::jsonb,
  album_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists library_follows (
  id uuid primary key default gen_random_uuid(),
  library_id uuid references user_libraries(id) on delete cascade,
  device_id text not null,
  created_at timestamptz default now(),
  unique(library_id, device_id)
);

alter table user_libraries enable row level security;
alter table library_follows enable row level security;

drop policy if exists "Anyone can read libraries" on user_libraries;
create policy "Anyone can read libraries" on user_libraries for select using (true);

drop policy if exists "Anyone can publish libraries" on user_libraries;
drop policy if exists "Authenticated users can publish libraries" on user_libraries;
create policy "Authenticated users can publish libraries" on user_libraries
for insert
to authenticated
with check (true);

drop policy if exists "Anyone can update own library device" on user_libraries;
drop policy if exists "Authenticated users can update libraries" on user_libraries;
create policy "Authenticated users can update libraries" on user_libraries
for update
to authenticated
using (true)
with check (true);

-- Allows the app's Remove library button to delete a mistaken public library.
drop policy if exists "Anyone can remove libraries" on user_libraries;
drop policy if exists "Authenticated users can remove libraries" on user_libraries;
create policy "Authenticated users can remove libraries" on user_libraries
for delete
to authenticated
using (true);

drop policy if exists "Anyone can read library follows" on library_follows;
create policy "Anyone can read library follows" on library_follows for select using (true);

drop policy if exists "Anyone can follow libraries" on library_follows;
drop policy if exists "Authenticated users can follow libraries" on library_follows;
create policy "Authenticated users can follow libraries" on library_follows
for insert
to authenticated
with check (true);

drop view if exists library_feed;
create or replace view library_feed as
select
  l.id,
  l.device_id,
  l.username,
  l.title,
  l.items,
  l.album_count,
  l.updated_at,
  count(f.id)::int as followers_count
from user_libraries l
left join library_follows f on f.library_id = l.id
group by l.id;

-- Admin-editable album overviews
create table if not exists album_overviews (
  album_key text primary key,
  title text not null,
  artist text,
  overview text not null default '',
  updated_at timestamptz default now()
);

alter table album_overviews enable row level security;

drop policy if exists "Anyone can read album overviews" on album_overviews;
create policy "Anyone can read album overviews" on album_overviews for select using (true);

-- Do not add public insert/update/delete policies here.
-- Overview edits are saved through the Netlify admin-overview function with the Supabase service role key.

-- Nested replies for album listener reactions
create table if not exists album_comment_replies (
  id uuid primary key default gen_random_uuid(),
  album_ref text not null,
  comment_id uuid not null,
  device_id text not null,
  name text not null default 'Listener',
  reply text not null,
  created_at timestamptz default now()
);

alter table album_comment_replies enable row level security;

drop policy if exists "Anyone can read album comment replies" on album_comment_replies;
create policy "Anyone can read album comment replies" on album_comment_replies for select using (true);

drop policy if exists "Anyone can add album comment replies" on album_comment_replies;
drop policy if exists "Authenticated users can add album comment replies" on album_comment_replies;
create policy "Authenticated users can add album comment replies" on album_comment_replies
for insert
to authenticated
with check (true);

-- Admin-selected most loved song for album popups
alter table album_overviews add column if not exists loved_track_key text;
alter table album_overviews add column if not exists loved_track_name text;

-- Admin-displayed album rating count override
alter table album_overviews add column if not exists admin_ratings_count int;

-- Admin-displayed album Musica score override
alter table album_overviews add column if not exists admin_score numeric;

-- Admin-adjustable album popup image positions
alter table album_overviews add column if not exists hero_focus text;
alter table album_overviews add column if not exists moment_focus text;
