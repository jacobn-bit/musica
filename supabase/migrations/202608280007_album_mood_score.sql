-- Ensure the album mood bar has durable storage in every deployed schema.

alter table public.album_overviews
  add column if not exists mood_score numeric;

alter table public.album_overviews
  drop constraint if exists album_overviews_mood_score_check;

alter table public.album_overviews
  add constraint album_overviews_mood_score_check
  check (mood_score is null or mood_score between 0 and 100);

notify pgrst, 'reload schema';
