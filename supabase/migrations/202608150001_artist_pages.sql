-- Muze artist profiles and album relationships.
-- Additive migration: existing albums and their artist text are preserved.

create or replace function public.muze_artist_key(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(lower(trim(coalesce(value, ''))),
      'áàâäãåāçćčéèêëēíìîïīñńóòôöõøōśšúùûüūýÿžźż',
      'aaaaaaaccceeeeeiiiiinnooooooossuuuuuyyzzz'),
    '[^a-z0-9]+', '', 'g'
  );
$$;

create or replace function public.muze_artist_slug(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    translate(lower(trim(coalesce(value, ''))),
      'áàâäãåāçćčéèêëēíìîïīñńóòôöõøōśšúùûüūýÿžźż',
      'aaaaaaaccceeeeeiiiiinnooooooossuuuuuyyzzz'),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null unique,
  slug text not null unique,
  image_url text,
  bio text,
  bio_sources jsonb not null default '[]'::jsonb,
  bio_generated_at timestamptz,
  bio_generation_model text,
  country text,
  formed_year int,
  disbanded_year int,
  birth_date date,
  death_date date,
  artist_type text,
  genres text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.album_artists (
  album_id uuid not null references public.albums(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  role text not null default 'Primary Artist',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  primary key (album_id, artist_id, role)
);

create index if not exists album_artists_artist_id_idx
  on public.album_artists(artist_id, sort_order, album_id);

insert into public.artists (name, name_key, slug)
select source.name, source.name_key,
  case when source.slug <> '' then source.slug else 'artist-' || substr(md5(source.name), 1, 10) end
from (
  select distinct on (public.muze_artist_key(artist))
    trim(artist) as name,
    public.muze_artist_key(artist) as name_key,
    public.muze_artist_slug(artist) as slug
  from public.albums
  where nullif(trim(artist), '') is not null
    and public.muze_artist_key(artist) <> ''
  order by public.muze_artist_key(artist), created_at asc
) source
on conflict (name_key) do nothing;

insert into public.album_artists (album_id, artist_id, role, sort_order)
select albums.id, artists.id, 'Primary Artist', 0
from public.albums albums
join public.artists artists
  on artists.name_key = public.muze_artist_key(albums.artist)
where nullif(trim(albums.artist), '') is not null
on conflict (album_id, artist_id, role) do nothing;

create or replace function public.sync_album_primary_artist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_key text;
  next_slug text;
  next_artist_id uuid;
begin
  next_key := public.muze_artist_key(new.artist);
  if next_key = '' then return new; end if;
  next_slug := public.muze_artist_slug(new.artist);

  insert into public.artists (name, name_key, slug)
  values (
    trim(new.artist),
    next_key,
    case when next_slug <> '' then next_slug else 'artist-' || substr(md5(new.artist), 1, 10) end
  )
  on conflict (name_key) do nothing;

  select id into next_artist_id from public.artists where name_key = next_key limit 1;

  if tg_op = 'UPDATE' and old.artist is distinct from new.artist then
    delete from public.album_artists where album_id = new.id and role = 'Primary Artist';
  end if;

  insert into public.album_artists (album_id, artist_id, role, sort_order)
  values (new.id, next_artist_id, 'Primary Artist', 0)
  on conflict (album_id, artist_id, role) do nothing;
  return new;
end;
$$;

drop trigger if exists albums_sync_primary_artist on public.albums;
create trigger albums_sync_primary_artist
after insert or update of artist on public.albums
for each row execute function public.sync_album_primary_artist();

alter table public.artists enable row level security;
alter table public.album_artists enable row level security;

drop policy if exists "Anyone can read artists" on public.artists;
create policy "Anyone can read artists"
  on public.artists for select using (true);

drop policy if exists "Anyone can read album artists" on public.album_artists;
create policy "Anyone can read album artists"
  on public.album_artists for select using (true);

-- Writes intentionally have no public policy. Muze admin writes use the service role.
