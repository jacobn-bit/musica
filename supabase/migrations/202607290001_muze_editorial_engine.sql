-- Muze Editorial Engine
-- Run once in the Supabase SQL Editor before deploying the matching Netlify functions.

create extension if not exists pgcrypto;

create table if not exists public.muze_rating_benchmarks (
  id uuid primary key default gen_random_uuid(),
  artist_name text not null,
  album_title text not null,
  release_year int,
  muze_score numeric(3,1) not null check (muze_score between 1.0 and 10.0),
  benchmark_level text not null check (benchmark_level in ('global', 'artist', 'genre', 'era')),
  genre text,
  era text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_name, album_title, release_year, benchmark_level)
);

insert into public.muze_rating_benchmarks
  (artist_name, album_title, release_year, muze_score, benchmark_level, notes)
values
  ('The Beatles', 'Abbey Road', 1969, 9.7, 'global', 'Required Muze global benchmark'),
  ('Pink Floyd', 'The Dark Side of the Moon', 1973, 9.7, 'global', 'Required Muze global benchmark'),
  ('Bob Dylan', 'Highway 61 Revisited', 1965, 9.7, 'global', 'Required Muze global benchmark'),
  ('Prince and the Revolution', 'Purple Rain', 1984, 9.6, 'global', 'Required Muze global benchmark'),
  ('The Beatles', 'Rubber Soul', 1965, 9.5, 'global', 'Required Muze global benchmark'),
  ('Metallica', 'Master of Puppets', 1986, 9.5, 'global', 'Required Muze global benchmark')
on conflict (artist_name, album_title, release_year, benchmark_level)
do update set
  muze_score = excluded.muze_score,
  notes = excluded.notes,
  updated_at = now();

create table if not exists public.muze_editorial_examples (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'canonical_masterpiece',
    'excellent_but_imperfect',
    'strong_album',
    'weak_album',
    'obscure_album'
  )),
  album_title text not null,
  artist_name text not null,
  review_json jsonb not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.album_reviews (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  album_key text not null,
  album_title text not null,
  artist_name text not null,
  revision int not null check (revision > 0),
  parent_review_id uuid references public.album_reviews(id) on delete set null,
  status text not null default 'not_generated' check (status in (
    'not_generated',
    'generating',
    'draft',
    'needs_revision',
    'quality_failed',
    'approved',
    'rejected'
  )),
  generated_review jsonb,
  editable_review jsonb,
  generation_context jsonb,
  generation_model text,
  quality_control_model text,
  prompt_version text not null,
  generated_at timestamptz,
  quality_control_at timestamptz,
  quality_score int check (quality_score between 0 and 100),
  quality_problems jsonb not null default '[]'::jsonb,
  factual_warnings jsonb not null default '[]'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (album_id, revision)
);

create index if not exists album_reviews_album_status_idx
  on public.album_reviews (album_id, status, revision desc);

create unique index if not exists album_reviews_one_generating_idx
  on public.album_reviews (album_id)
  where status = 'generating';

alter table public.muze_rating_benchmarks enable row level security;
alter table public.muze_editorial_examples enable row level security;
alter table public.album_reviews enable row level security;

drop policy if exists "Public can read Muze rating benchmarks" on public.muze_rating_benchmarks;
create policy "Public can read Muze rating benchmarks"
on public.muze_rating_benchmarks for select using (true);

drop policy if exists "Public can read approved album reviews" on public.album_reviews;
create policy "Public can read approved album reviews"
on public.album_reviews for select using (status = 'approved');

-- No browser write policy is created for reviews, benchmarks, or examples.
-- Draft access and every mutation go through a PIN-protected Netlify function
-- using the Supabase service role.

create or replace view public.published_album_reviews
with (security_invoker = true)
as
select distinct on (album_id)
  id,
  album_id,
  album_key,
  album_title,
  artist_name,
  revision,
  editable_review as review,
  generation_model,
  prompt_version,
  quality_score,
  approved_at
from public.album_reviews
where status = 'approved'
order by album_id, revision desc;

grant select on public.published_album_reviews to anon, authenticated;
