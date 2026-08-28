-- Public Muze catalogue data must be identical for signed-out and signed-in listeners.

grant usage on schema public to anon, authenticated;
grant select on table public.albums to anon, authenticated;
grant select on table public.ratings to anon, authenticated;
grant select on table public.album_overviews to anon, authenticated;
grant select on table public.album_metadata to anon, authenticated;
grant select on table public.published_album_reviews to anon, authenticated;
grant select on table public.album_scores to anon, authenticated;

alter table public.albums enable row level security;
drop policy if exists "Anyone can read albums" on public.albums;
create policy "Anyone can read albums"
on public.albums for select
to anon, authenticated
using (true);

alter table public.ratings enable row level security;
drop policy if exists "Anyone can read ratings" on public.ratings;
create policy "Anyone can read ratings"
on public.ratings for select
to anon, authenticated
using (true);

alter table public.album_overviews enable row level security;
drop policy if exists "Anyone can read album overviews" on public.album_overviews;
create policy "Anyone can read album overviews"
on public.album_overviews for select
to anon, authenticated
using (true);

alter table public.album_metadata enable row level security;
drop policy if exists "Anyone can read album metadata" on public.album_metadata;
create policy "Anyone can read album metadata"
on public.album_metadata for select
to anon, authenticated
using (true);

