-- Cached, catalogue-constrained AI recommendations for Muze album pages.

create table if not exists public.album_similarity_profiles (
  album_id uuid primary key references public.albums(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  generation_model text not null,
  prompt_version text not null,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.album_recommendations (
  source_album_id uuid not null references public.albums(id) on delete cascade,
  target_album_id uuid not null references public.albums(id) on delete cascade,
  position smallint not null check (position between 1 and 4),
  similarity_score smallint not null check (similarity_score between 0 and 100),
  relationship text not null check (relationship in ('sonic','production','mood','album_structure','scene_and_era','multi_dimensional')),
  reason text not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  sources jsonb not null default '[]'::jsonb,
  generation_model text not null,
  prompt_version text not null,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_album_id, target_album_id),
  unique (source_album_id, position),
  check (source_album_id <> target_album_id)
);

create index if not exists album_recommendations_source_position_idx
  on public.album_recommendations (source_album_id, position);

alter table public.album_similarity_profiles enable row level security;
alter table public.album_recommendations enable row level security;

drop policy if exists "Public can read album similarity profiles" on public.album_similarity_profiles;
create policy "Public can read album similarity profiles"
on public.album_similarity_profiles for select using (true);

drop policy if exists "Public can read album recommendations" on public.album_recommendations;
create policy "Public can read album recommendations"
on public.album_recommendations for select using (true);

grant select on public.album_similarity_profiles to anon, authenticated;
grant select on public.album_recommendations to anon, authenticated;

-- Writes intentionally have no browser policy. The Netlify function uses the service role.
