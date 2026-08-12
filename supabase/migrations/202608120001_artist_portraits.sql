-- Licensed Wikimedia Commons portraits for album personnel.
-- Existing credits remain valid and continue to use initials until a portrait is approved.

alter table if exists album_credits
  add column if not exists person_wikidata_id text,
  add column if not exists image_source_url text,
  add column if not exists image_author text,
  add column if not exists image_license text,
  add column if not exists image_license_url text,
  add column if not exists image_attribution text,
  add column if not exists image_modified text,
  add column if not exists image_status text not null default 'candidate',
  add column if not exists image_approved boolean not null default false,
  add column if not exists image_last_verified_at timestamptz,
  add column if not exists image_rejected_urls jsonb not null default '[]'::jsonb;

update album_credits
set image_status = 'candidate'
where image_status is null;

alter table if exists album_credits
  drop constraint if exists album_credits_image_status_check;

alter table if exists album_credits
  add constraint album_credits_image_status_check
  check (image_status in ('candidate', 'approved', 'rejected', 'unavailable'));

create index if not exists album_credits_portrait_review_idx
on album_credits(image_status, credit_type)
where image_url is not null;
