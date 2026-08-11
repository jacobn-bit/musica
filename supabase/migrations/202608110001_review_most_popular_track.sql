-- Preserve manually entered review facts in album_overviews.

alter table public.album_overviews
  add column if not exists review_most_popular_track jsonb;

alter table public.album_overviews
  add column if not exists review_factual_warnings jsonb not null default '[]'::jsonb;
