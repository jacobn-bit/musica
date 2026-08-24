-- Optional editorial journey metadata for the Muze track section.
-- This remains null until an editor explicitly curates an album arc.
alter table public.album_overviews
  add column if not exists album_arc jsonb;

comment on column public.album_overviews.album_arc is
  'Optional manual structure: {"title": text, "phases": [{"label": text, "start_track": int, "end_track": int}]}';
