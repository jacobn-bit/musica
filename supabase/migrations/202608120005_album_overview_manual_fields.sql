-- Complete storage for Muze's structured and manually edited album overviews.
-- Safe to run more than once in the Supabase SQL Editor.

alter table public.album_overviews
  add column if not exists album_id text,
  add column if not exists intro_summary text,
  add column if not exists sound_summary text,
  add column if not exists impact_summary text,
  add column if not exists legacy_summary text,
  add column if not exists quote_headline text,
  add column if not exists defining_tracks jsonb not null default '[]'::jsonb,
  add column if not exists sources_used jsonb not null default '[]'::jsonb,
  add column if not exists source_summary text,
  add column if not exists fallback_generated boolean not null default false,
  add column if not exists generated_at timestamptz,
  add column if not exists generation_model text,
  add column if not exists manual_override boolean not null default false,
  add column if not exists review_overview text,
  add column if not exists review_sound text,
  add column if not exists review_impact text,
  add column if not exists review_legacy text,
  add column if not exists review_tagline text,
  add column if not exists review_alternative_taglines jsonb not null default '[]'::jsonb,
  add column if not exists review_defining_moments jsonb not null default '[]'::jsonb,
  add column if not exists review_muze_score numeric(3,1),
  add column if not exists review_minimum_raters integer,
  add column if not exists review_closing_verdict text,
  add column if not exists review_mellow_intense_score integer,
  add column if not exists review_mellow_intense_explanation text,
  add column if not exists review_most_popular_track jsonb,
  add column if not exists review_factual_warnings jsonb not null default '[]'::jsonb,
  add column if not exists review_generated_at timestamptz,
  add column if not exists review_generation_model text,
  add column if not exists review_manual_fields jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
