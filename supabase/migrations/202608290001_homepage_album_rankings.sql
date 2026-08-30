-- These indexes support the two real homepage ranking inputs:
-- album_scores aggregates ratings by album, while the paged ranking endpoint
-- reads only editorial rows that carry a Muze score override.
create index if not exists ratings_album_id_idx
  on public.ratings (album_id);

create index if not exists album_overviews_admin_score_idx
  on public.album_overviews (admin_score desc)
  where admin_score is not null;

create index if not exists album_overviews_admin_ratings_count_idx
  on public.album_overviews (admin_ratings_count desc)
  where admin_ratings_count is not null;
