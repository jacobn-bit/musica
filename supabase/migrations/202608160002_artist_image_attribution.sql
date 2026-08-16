-- Artist profile image attribution fields.
-- These mirror credit portrait metadata so bio/profile images can show reusable-source credit.

alter table public.artists
  add column if not exists image_source_url text,
  add column if not exists image_author text,
  add column if not exists image_license text,
  add column if not exists image_license_url text,
  add column if not exists image_attribution text;
