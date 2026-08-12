-- Conservative, auditable record-label logo approvals.
-- Existing logo sources enter Needs Review and are never grandfathered as approved.

create table if not exists record_label_logos (
  id uuid primary key default gen_random_uuid(),
  album_ref text not null,
  label_id uuid not null references album_labels(id) on delete cascade,
  label_name text not null,
  logo_url text,
  source_type text,
  source_page_url text,
  source_file_url text,
  license_name text,
  license_url text,
  copyright_status text,
  attribution_text text,
  creator text,
  trademark_notice text,
  commercial_use_allowed boolean,
  requires_attribution boolean not null default false,
  verified boolean not null default false,
  verified_at timestamptz,
  manually_verified boolean not null default false,
  review_status text not null default 'needs_review' check (review_status in ('approved', 'needs_review', 'rejected')),
  review_reason text,
  approved_by text,
  approved_at timestamptz,
  approval_notes text,
  notes text,
  last_license_check_at timestamptz,
  license_status_changed boolean not null default false,
  source_metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(label_id)
);

create index if not exists record_label_logos_album_ref_idx on record_label_logos(album_ref);
create index if not exists record_label_logos_review_idx on record_label_logos(review_status, license_status_changed);

alter table record_label_logos enable row level security;
drop policy if exists "Anyone can read record label logo audits" on record_label_logos;
-- No public policy: the Netlify service role reads audits and returns only safe public fields.

-- Inventory the five legacy logo paths. They remain hidden pending a fresh source review.
insert into record_label_logos (
  album_ref, label_id, label_name, logo_url, source_type, source_page_url,
  review_status, review_reason, notes, verified, manually_verified
)
select
  label.album_ref,
  label.id,
  label.label_name,
  case
    when normalized ~ '^(warner|warner records|warner bros|warner bros records|warner brothers|warner brothers records)$' then 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Warner_Records_(2019_Logo).svg'
    when normalized ~ '^(track|track record|track records)$' then 'https://upload.wikimedia.org/wikipedia/en/0/02/Trackrecs.jpg'
    when normalized ~ '^(tamla|tamla record|tamla records|tamla record company)$' then 'https://thumbs.peoplesgdarchive.org/static/media-items/image/38213/fit-512x512/67c9dca4/1/L-6200-1697646350-6647.jpg'
    when normalized ~ '^(apple|apple records)$' then 'https://upload.wikimedia.org/wikipedia/en/0/04/Apple_Records.png'
    when normalized ~ '^(dgc|dgc records)$' then 'https://upload.wikimedia.org/wikipedia/en/f/fa/DGC_Records_logo%2C_1990.png'
  end,
  'Legacy Muze source',
  case when normalized ~ '^warner' then 'https://commons.wikimedia.org/wiki/File:Warner_Records_(2019_Logo).svg' else label.source_url end,
  'needs_review',
  'Legacy logo source has not yet been checked against current file metadata and reuse terms.',
  'Migrated without approval. Public display is disabled until reviewed.',
  false,
  false
from (
  select album_labels.*, trim(regexp_replace(lower(regexp_replace(label_name, E'\\s*\\([^)]*\\)\\s*', ' ', 'g')), '[^a-z0-9]+', ' ', 'g')) as normalized
  from album_labels
) label
where normalized ~ '^(warner|warner records|warner bros|warner bros records|warner brothers|warner brothers records|track|track record|track records|tamla|tamla record|tamla records|tamla record company|apple|apple records|dgc|dgc records)$'
on conflict (label_id) do nothing;
