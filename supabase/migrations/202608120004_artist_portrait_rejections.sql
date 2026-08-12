-- Remember rejected Commons portraits so Muze can offer a different candidate.

alter table if exists album_credits
  add column if not exists image_rejected_urls jsonb not null default '[]'::jsonb;
