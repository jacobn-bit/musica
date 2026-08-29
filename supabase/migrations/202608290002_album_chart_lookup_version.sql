alter table public.album_metadata
  add column if not exists chart_lookup_version text;

notify pgrst, 'reload schema';
