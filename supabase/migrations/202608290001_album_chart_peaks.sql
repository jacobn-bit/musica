-- Verified primary album-chart peaks displayed in the album hero statistics.

alter table public.album_metadata
  add column if not exists chart_peak_position integer,
  add column if not exists chart_name text,
  add column if not exists chart_country text,
  add column if not exists chart_source_url text,
  add column if not exists chart_checked_at timestamptz;

alter table public.album_metadata
  drop constraint if exists album_metadata_chart_peak_position_check;

alter table public.album_metadata
  add constraint album_metadata_chart_peak_position_check
  check (chart_peak_position is null or chart_peak_position between 1 and 250);

notify pgrst, 'reload schema';
