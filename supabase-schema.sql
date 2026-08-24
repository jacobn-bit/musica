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
alter table albums add column if not exists wikipedia_url text;
alter table albums add column if not exists source_url text;

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
  a.wikipedia_url,
  a.source_url,
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
  user_id uuid references auth.users(id) on delete set null,
  avatar_url text,
  name text not null default 'Listener',
  comment text not null,
  created_at timestamptz default now()
);

alter table album_comments add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table album_comments add column if not exists avatar_url text;

create table if not exists album_comment_likes (
  comment_id uuid references album_comments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (comment_id, user_id)
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
alter table album_comment_likes enable row level security;
alter table track_ratings enable row level security;

drop policy if exists "Anyone can read album comments" on album_comments;
create policy "Anyone can read album comments" on album_comments for select using (true);

drop policy if exists "Anyone can add album comments" on album_comments;
drop policy if exists "Authenticated users can add album comments" on album_comments;
create policy "Authenticated users can add album comments" on album_comments
for insert
to authenticated
with check (true);

drop policy if exists "Anyone can read album comment likes" on album_comment_likes;
create policy "Anyone can read album comment likes" on album_comment_likes for select using (true);

drop policy if exists "Authenticated users can like album comments" on album_comment_likes;
create policy "Authenticated users can like album comments" on album_comment_likes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can unlike album comments" on album_comment_likes;
create policy "Authenticated users can unlike album comments" on album_comment_likes
for delete
to authenticated
using (auth.uid() = user_id);

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
  user_id uuid references auth.users(id) on delete set null,
  device_id text not null,
  name text not null default 'Listener',
  avatar_url text,
  comment text not null,
  created_at timestamptz default now()
);

alter table track_comments add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table track_comments add column if not exists avatar_url text;

create table if not exists track_comment_likes (
  comment_id uuid references track_comments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (comment_id, user_id)
);

alter table track_comments enable row level security;
alter table track_comment_likes enable row level security;

drop policy if exists "Anyone can read track comments" on track_comments;
create policy "Anyone can read track comments" on track_comments for select using (true);

drop policy if exists "Anyone can add track comments" on track_comments;
drop policy if exists "Authenticated users can add track comments" on track_comments;
create policy "Authenticated users can add track comments" on track_comments
for insert
to authenticated
with check (true);

drop policy if exists "Anyone can read track comment likes" on track_comment_likes;
create policy "Anyone can read track comment likes" on track_comment_likes for select using (true);

drop policy if exists "Authenticated users can like track comments" on track_comment_likes;
create policy "Authenticated users can like track comments" on track_comment_likes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can unlike track comments" on track_comment_likes;
create policy "Authenticated users can unlike track comments" on track_comment_likes
for delete
to authenticated
using (auth.uid() = user_id);

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

create or replace view public_track_ratings as
select
  album_ref,
  track_key,
  track_name,
  coalesce(nullif(username, ''), 'Listener') as username,
  rating,
  created_at
from track_ratings;


-- Store usernames with ratings
alter table ratings add column if not exists username text;
alter table track_ratings add column if not exists username text;
alter table ratings add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table track_ratings add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists ratings_user_id_idx on ratings(user_id);
create index if not exists track_ratings_user_id_idx on track_ratings(user_id);


-- Public cannot read raw rating identities; aggregated score views stay public.
drop policy if exists "Anyone can read ratings" on ratings;
drop policy if exists "Anyone can read track ratings" on track_ratings;
drop policy if exists "Authenticated users can read own ratings" on ratings;
create policy "Authenticated users can read own ratings" on ratings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read own track ratings" on track_ratings;
create policy "Authenticated users can read own track ratings" on track_ratings
for select
to authenticated
using (auth.uid() = user_id);


-- Public followable user libraries
create table if not exists user_libraries (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  username text not null,
  title text not null,
  items jsonb not null default '[]'::jsonb,
  album_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_libraries add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists user_libraries_user_id_idx on user_libraries (user_id);

create or replace function public.set_user_library_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists user_libraries_set_owner on public.user_libraries;
create trigger user_libraries_set_owner
before insert or update on public.user_libraries
for each row
execute function public.set_user_library_owner();

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
  l.user_id,
  l.username,
  l.title,
  l.items,
  l.album_count,
  l.updated_at,
  count(f.id)::int as followers_count
from user_libraries l
left join library_follows f on f.library_id = l.id
group by l.id, l.device_id, l.user_id, l.username, l.title, l.items, l.album_count, l.updated_at;

-- Admin-editable album overviews
create table if not exists album_overviews (
  album_key text primary key,
  title text not null,
  artist text,
  overview text not null default '',
  updated_at timestamptz default now()
);

alter table album_overviews add column if not exists album_id text;
alter table album_overviews add column if not exists intro_summary text;
alter table album_overviews add column if not exists sound_summary text;
alter table album_overviews add column if not exists impact_summary text;
alter table album_overviews add column if not exists legacy_summary text;
alter table album_overviews add column if not exists quote_headline text;
alter table album_overviews add column if not exists defining_tracks jsonb not null default '[]'::jsonb;
alter table album_overviews add column if not exists sources_used jsonb not null default '[]'::jsonb;
alter table album_overviews add column if not exists source_summary text;
alter table album_overviews add column if not exists fallback_generated boolean not null default false;
alter table album_overviews add column if not exists generated_at timestamptz;
alter table album_overviews add column if not exists generation_model text;
alter table album_overviews add column if not exists manual_override boolean not null default false;
create index if not exists album_overviews_album_id_idx on album_overviews(album_id);

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
  user_id uuid references auth.users(id) on delete set null,
  avatar_url text,
  name text not null default 'Listener',
  reply text not null,
  created_at timestamptz default now()
);

alter table album_comment_replies add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table album_comment_replies add column if not exists avatar_url text;
create index if not exists album_comment_replies_user_id_idx on album_comment_replies(user_id);

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

-- Optional, manually curated album journey. Null means the Album Arc stays hidden.
alter table album_overviews add column if not exists album_arc jsonb;

-- Admin-displayed album rating count override
alter table album_overviews add column if not exists admin_ratings_count int;

-- Admin-displayed album Musica score override
alter table album_overviews add column if not exists admin_score numeric;

-- Admin-adjustable Vibe & Mood bar position for album popups
alter table album_overviews add column if not exists mood_score numeric;

-- Admin-assigned album genre/category override
alter table album_overviews add column if not exists manual_genre text;

-- Admin-adjustable album popup image positions
alter table album_overviews add column if not exists hero_focus text;
alter table album_overviews add column if not exists overview_focus text;
alter table album_overviews add column if not exists moment_focus text;

-- Generated + editable Muze album reviews
alter table album_overviews add column if not exists review_overview text;
alter table album_overviews add column if not exists review_sound text;
alter table album_overviews add column if not exists review_impact text;
alter table album_overviews add column if not exists review_legacy text;
alter table album_overviews add column if not exists review_tagline text;
alter table album_overviews add column if not exists review_alternative_taglines jsonb not null default '[]'::jsonb;
alter table album_overviews add column if not exists review_defining_moments jsonb not null default '[]'::jsonb;
alter table album_overviews add column if not exists review_muze_score numeric;
alter table album_overviews add column if not exists review_minimum_raters int;
alter table album_overviews add column if not exists review_closing_verdict text;
alter table album_overviews add column if not exists review_mellow_intense_score int;
alter table album_overviews add column if not exists review_mellow_intense_explanation text;
alter table album_overviews add column if not exists review_generated_at timestamptz;
alter table album_overviews add column if not exists review_generation_model text;
alter table album_overviews add column if not exists review_manual_fields jsonb not null default '[]'::jsonb;
alter table album_overviews add column if not exists review_most_popular_track jsonb;
alter table album_overviews add column if not exists review_factual_warnings jsonb not null default '[]'::jsonb;

-- Detailed factual album information. The standalone migration at
-- supabase/album-info-schema.sql can also be run independently.
create table if not exists album_metadata (
  album_ref text primary key, album_id text, title text not null, artist text not null,
  original_release_date text, release_year int, country text, album_type text,
  total_runtime_ms bigint, track_count int, musicbrainz_release_id text,
  musicbrainz_release_group_id text, source text, source_url text,
  source_confidence text, manually_verified boolean not null default false,
  last_verified_at timestamptz, updated_at timestamptz not null default now()
);
create table if not exists album_credits (
  id uuid primary key default gen_random_uuid(), album_ref text not null, album_id text,
  person_name text not null, person_id text, image_url text, credit_type text not null,
  role text, instrument text, sort_order int not null default 0, source text,
  source_url text, manually_verified boolean not null default false,
  updated_at timestamptz not null default now()
);
create unique index if not exists album_credits_identity_idx on album_credits(album_ref, person_name, credit_type, coalesce(role, ''), coalesce(instrument, ''));
create index if not exists album_credits_album_ref_idx on album_credits(album_ref);
create table if not exists album_labels (
  id uuid primary key default gen_random_uuid(), album_ref text not null, album_id text,
  label_name text not null, label_type text not null default 'label',
  is_original_label boolean not null default false, release_region text, source text,
  source_url text, manually_verified boolean not null default false,
  updated_at timestamptz not null default now()
);
create unique index if not exists album_labels_identity_idx on album_labels(album_ref, label_name, label_type, coalesce(release_region, ''));
create index if not exists album_labels_album_ref_idx on album_labels(album_ref);
create table if not exists album_sales (
  album_ref text primary key, album_id text, worldwide_sales_estimate bigint,
  worldwide_sales_min bigint, worldwide_sales_max bigint, display_value text,
  confidence text, source text, source_url text,
  manually_verified boolean not null default false, last_verified_at timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists album_certifications (
  id uuid primary key default gen_random_uuid(), album_ref text not null, album_id text,
  country text not null, certification text not null, certified_units bigint,
  organization text, source text, source_url text,
  manually_verified boolean not null default false,
  updated_at timestamptz not null default now()
);
create unique index if not exists album_certifications_identity_idx on album_certifications(album_ref, country, certification, coalesce(organization, ''));
create index if not exists album_certifications_album_ref_idx on album_certifications(album_ref);
alter table album_metadata enable row level security;
alter table album_credits enable row level security;
alter table album_labels enable row level security;
alter table album_sales enable row level security;
alter table album_certifications enable row level security;
drop policy if exists "Anyone can read album metadata" on album_metadata;
create policy "Anyone can read album metadata" on album_metadata for select using (true);
drop policy if exists "Anyone can read album credits" on album_credits;
create policy "Anyone can read album credits" on album_credits for select using (true);
drop policy if exists "Anyone can read album labels" on album_labels;
create policy "Anyone can read album labels" on album_labels for select using (true);
drop policy if exists "Anyone can read album sales" on album_sales;
create policy "Anyone can read album sales" on album_sales for select using (true);
drop policy if exists "Anyone can read album certifications" on album_certifications;
create policy "Anyone can read album certifications" on album_certifications for select using (true);

-- Muze user profile avatars
-- Existing auth users are preserved; this only adds profile/avatar storage.
-- Users can browse publicly without a profile row.
-- Logged-in users can create/update only their own profile avatar.
create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  avatar_url text,
  avatar_config jsonb,
  avatar_svg text,
  avatar_type text,
  skipped_avatar_setup boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_profiles add column if not exists email text;
alter table user_profiles add column if not exists username text;
alter table user_profiles add column if not exists avatar_url text;
alter table user_profiles add column if not exists avatar_config jsonb;
alter table user_profiles add column if not exists avatar_svg text;
alter table user_profiles add column if not exists avatar_type text;
alter table user_profiles add column if not exists skipped_avatar_setup boolean not null default false;
alter table user_profiles add column if not exists created_at timestamptz default now();
alter table user_profiles add column if not exists updated_at timestamptz default now();

do $$
begin
  execute '
    update user_libraries l
    set user_id = p.user_id
    from user_profiles p
    where l.user_id is null
      and lower(trim(l.username)) = lower(trim(p.username))
      and coalesce(trim(p.username), '''') <> ''''
  ';
end $$;

alter table user_profiles enable row level security;

drop policy if exists "Users can read their own profile" on user_profiles;
create policy "Users can read their own profile"
on user_profiles for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own profile" on user_profiles;
create policy "Users can insert their own profile"
on user_profiles for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on user_profiles;
create policy "Users can update their own profile"
on user_profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Public profile directory for chat/account discovery.
-- This intentionally omits email addresses; direct messages use user_id.
create or replace view public_user_profiles as
select
  user_id,
  username,
  avatar_url,
  avatar_config,
  avatar_svg,
  avatar_type,
  created_at
from user_profiles
where coalesce(username, '') <> '';

grant select on public_user_profiles to anon, authenticated;

-- Account-to-account chat messages.
-- Senders and recipients can read their shared messages. Only recipients can
-- mark incoming messages as read.
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  message_type text not null default 'text',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists chat_messages_sender_created_idx on chat_messages (sender_id, created_at desc);
create index if not exists chat_messages_recipient_created_idx on chat_messages (recipient_id, created_at desc);
create index if not exists chat_messages_pair_created_idx on chat_messages (sender_id, recipient_id, created_at);

alter table chat_messages enable row level security;

drop policy if exists "Users can read their own chat messages" on chat_messages;
create policy "Users can read their own chat messages"
on chat_messages for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Users can send chat messages" on chat_messages;
create policy "Users can send chat messages"
on chat_messages for insert
to authenticated
with check (auth.uid() = sender_id and sender_id <> recipient_id);

drop policy if exists "Recipients can mark chat messages read" on chat_messages;
create policy "Recipients can mark chat messages read"
on chat_messages for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

-- Bell notifications for account activity such as comment likes.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  notification_type text not null,
  entity_type text,
  entity_id uuid,
  album_ref text,
  album_title text,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create unique index if not exists notifications_unique_activity_idx
on notifications (recipient_id, actor_id, notification_type, entity_id);

create index if not exists notifications_recipient_created_idx
on notifications (recipient_id, created_at desc);

alter table notifications enable row level security;

drop policy if exists "Users can read their own notifications" on notifications;
create policy "Users can read their own notifications"
on notifications for select
to authenticated
using (auth.uid() = recipient_id);

drop policy if exists "Users can create notifications for their actions" on notifications;
create policy "Users can create notifications for their actions"
on notifications for insert
to authenticated
with check (auth.uid() = actor_id and recipient_id <> auth.uid());

drop policy if exists "Users can mark their own notifications read" on notifications;
create policy "Users can mark their own notifications read"
on notifications for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

-- Lightweight online presence for chat.
-- The app shows online only when last_seen_at is recent.
create table if not exists user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  is_online boolean not null default true
);

alter table user_presence enable row level security;

drop policy if exists "Anyone can read user presence" on user_presence;
create policy "Anyone can read user presence"
on user_presence for select
using (true);

drop policy if exists "Users can insert their own presence" on user_presence;
create policy "Users can insert their own presence"
on user_presence for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own presence" on user_presence;
create policy "Users can update their own presence"
on user_presence for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Avatar photo uploads use Supabase Storage.
-- If the bucket already exists, this keeps it unchanged.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar images" on storage.objects;
create policy "Users can upload their own avatar images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update their own avatar images" on storage.objects;
create policy "Users can update their own avatar images"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
