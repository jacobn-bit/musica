-- Preserve the provenance of administrator-approved Muze artist biographies.
alter table public.artists
  add column if not exists bio_sources jsonb not null default '[]'::jsonb,
  add column if not exists bio_generated_at timestamptz,
  add column if not exists bio_generation_model text;

comment on column public.artists.bio_sources is
  'Source links consulted for the approved Muze biography. Source prose is not stored here.';
