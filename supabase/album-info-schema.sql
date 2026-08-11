-- Muze album Info tab: normalized factual metadata and credits.
-- Run once in the Supabase SQL Editor. Existing albums and editorial data are untouched.

create table if not exists album_metadata (
  album_ref text primary key,
  album_id text,
  title text not null,
  artist text not null,
  original_release_date text,
  release_year int,
  country text,
  album_type text,
  total_runtime_ms bigint,
  track_count int,
  musicbrainz_release_id text,
  musicbrainz_release_group_id text,
  source text,
  source_url text,
  source_confidence text,
  manually_verified boolean not null default false,
  last_verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists album_credits (
  id uuid primary key default gen_random_uuid(),
  album_ref text not null,
  album_id text,
  person_name text not null,
  person_id text,
  person_wikidata_id text,
  image_url text,
  image_source_url text,
  image_author text,
  image_license text,
  image_license_url text,
  image_attribution text,
  image_modified text,
  image_status text not null default 'candidate',
  image_approved boolean not null default false,
  image_last_verified_at timestamptz,
  credit_type text not null,
  role text,
  instrument text,
  sort_order int not null default 0,
  source text,
  source_url text,
  manually_verified boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Keep reruns useful when album_credits was created by an earlier Muze schema.
alter table if exists album_credits
  add column if not exists person_wikidata_id text,
  add column if not exists image_source_url text,
  add column if not exists image_author text,
  add column if not exists image_license text,
  add column if not exists image_license_url text,
  add column if not exists image_attribution text,
  add column if not exists image_modified text,
  add column if not exists image_status text not null default 'candidate',
  add column if not exists image_approved boolean not null default false,
  add column if not exists image_last_verified_at timestamptz;

create unique index if not exists album_credits_identity_idx
on album_credits(album_ref, person_name, credit_type, coalesce(role, ''), coalesce(instrument, ''));
create index if not exists album_credits_album_ref_idx on album_credits(album_ref);

create table if not exists album_labels (
  id uuid primary key default gen_random_uuid(),
  album_ref text not null,
  album_id text,
  label_name text not null,
  label_type text not null default 'label',
  is_original_label boolean not null default false,
  release_region text,
  source text,
  source_url text,
  manually_verified boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index if not exists album_labels_identity_idx
on album_labels(album_ref, label_name, label_type, coalesce(release_region, ''));
create index if not exists album_labels_album_ref_idx on album_labels(album_ref);

create table if not exists album_sales (
  album_ref text primary key,
  album_id text,
  worldwide_sales_estimate bigint,
  worldwide_sales_min bigint,
  worldwide_sales_max bigint,
  display_value text,
  confidence text,
  source text,
  source_url text,
  manually_verified boolean not null default false,
  last_verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists album_certifications (
  id uuid primary key default gen_random_uuid(),
  album_ref text not null,
  album_id text,
  country text not null,
  certification text not null,
  certified_units bigint,
  organization text,
  source text,
  source_url text,
  manually_verified boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index if not exists album_certifications_identity_idx
on album_certifications(album_ref, country, certification, coalesce(organization, ''));
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

-- No public write policies: album-info imports and admin edits use the Netlify service role.
