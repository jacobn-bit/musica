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
  chart_peak_position int,
  chart_name text,
  chart_country text,
  chart_source_url text,
  chart_checked_at timestamptz,
  chart_lookup_version text,
  musicbrainz_release_id text,
  musicbrainz_release_group_id text,
  source text,
  source_url text,
  source_confidence text,
  manually_verified boolean not null default false,
  last_verified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table if exists album_metadata
  add column if not exists chart_peak_position int,
  add column if not exists chart_name text,
  add column if not exists chart_country text,
  add column if not exists chart_source_url text,
  add column if not exists chart_checked_at timestamptz,
  add column if not exists chart_lookup_version text;

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
  image_rejected_urls jsonb not null default '[]'::jsonb,
  credit_type text not null,
  role text,
  instrument text,
  sort_order int not null default 0,
  source text,
  source_url text,
  source_secondary text,
  source_secondary_url text,
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
  add column if not exists image_last_verified_at timestamptz,
  add column if not exists image_rejected_urls jsonb not null default '[]'::jsonb,
  add column if not exists source_secondary text,
  add column if not exists source_secondary_url text;

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

create table if not exists record_label_logos (
  id uuid primary key default gen_random_uuid(),
  album_ref text not null,
  label_id uuid not null references album_labels(id) on delete cascade,
  label_name text not null,
  logo_url text,
  source_type text,
  source_page_url text,
  source_file_url text,
  license_name text,
  license_url text,
  copyright_status text,
  attribution_text text,
  creator text,
  trademark_notice text,
  commercial_use_allowed boolean,
  requires_attribution boolean not null default false,
  verified boolean not null default false,
  verified_at timestamptz,
  manually_verified boolean not null default false,
  review_status text not null default 'needs_review' check (review_status in ('approved', 'needs_review', 'rejected')),
  review_reason text,
  approved_by text,
  approved_at timestamptz,
  approval_notes text,
  notes text,
  last_license_check_at timestamptz,
  license_status_changed boolean not null default false,
  source_metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(label_id)
);

create index if not exists record_label_logos_album_ref_idx on record_label_logos(album_ref);
create index if not exists record_label_logos_review_idx on record_label_logos(review_status, license_status_changed);

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
alter table record_label_logos enable row level security;
alter table album_sales enable row level security;
alter table album_certifications enable row level security;

drop policy if exists "Anyone can read album metadata" on album_metadata;
create policy "Anyone can read album metadata" on album_metadata for select using (true);
drop policy if exists "Anyone can read album credits" on album_credits;
create policy "Anyone can read album credits" on album_credits for select using (true);
drop policy if exists "Anyone can read album labels" on album_labels;
create policy "Anyone can read album labels" on album_labels for select using (true);
drop policy if exists "Anyone can read record label logo audits" on record_label_logos;
-- No public policy: the Netlify service role reads audits and returns only safe public fields.
drop policy if exists "Anyone can read album sales" on album_sales;
create policy "Anyone can read album sales" on album_sales for select using (true);
drop policy if exists "Anyone can read album certifications" on album_certifications;
create policy "Anyone can read album certifications" on album_certifications for select using (true);

-- No public write policies: album-info imports and admin edits use the Netlify service role.
