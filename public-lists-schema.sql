-- Public listener lists for Muze.
-- Run this once in the Supabase SQL editor after supabase-schema.sql.

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 70),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 220),
  is_public boolean not null default true,
  cover_image_url text,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.list_albums (
  list_id uuid not null references public.lists(id) on delete cascade,
  album_id uuid not null references public.albums(id) on delete cascade,
  position integer not null check (position >= 0),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  primary key (list_id, album_id),
  unique (list_id, position)
);

create table if not exists public.list_follows (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create index if not exists lists_public_rank_idx on public.lists (is_public, featured desc, updated_at desc);
create index if not exists lists_owner_idx on public.lists (user_id, updated_at desc);
create index if not exists list_albums_order_idx on public.list_albums (list_id, position);
create index if not exists list_follows_list_idx on public.list_follows (list_id);

create or replace function public.touch_list_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lists_touch_updated_at on public.lists;
create trigger lists_touch_updated_at
before update on public.lists
for each row execute function public.touch_list_updated_at();

alter table public.lists enable row level security;
alter table public.list_albums enable row level security;
alter table public.list_follows enable row level security;

drop policy if exists "Public lists are readable" on public.lists;
create policy "Public lists are readable" on public.lists
for select using (is_public or auth.uid() = user_id);

drop policy if exists "Owners create lists" on public.lists;
create policy "Owners create lists" on public.lists
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Owners update lists" on public.lists;
create policy "Owners update lists" on public.lists
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Owners delete lists" on public.lists;
create policy "Owners delete lists" on public.lists
for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Visible list albums are readable" on public.list_albums;
create policy "Visible list albums are readable" on public.list_albums
for select using (exists (
  select 1 from public.lists l
  where l.id = list_id and (l.is_public or l.user_id = auth.uid())
));

drop policy if exists "Owners add list albums" on public.list_albums;
create policy "Owners add list albums" on public.list_albums
for insert to authenticated with check (exists (
  select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()
));

drop policy if exists "Owners update list albums" on public.list_albums;
create policy "Owners update list albums" on public.list_albums
for update to authenticated using (exists (
  select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()
)) with check (exists (
  select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()
));

drop policy if exists "Owners remove list albums" on public.list_albums;
create policy "Owners remove list albums" on public.list_albums
for delete to authenticated using (exists (
  select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()
));

drop policy if exists "List follows are readable" on public.list_follows;
create policy "List follows are readable" on public.list_follows
for select using (exists (
  select 1 from public.lists l where l.id = list_id and (l.is_public or l.user_id = auth.uid())
));

drop policy if exists "Users follow public lists" on public.list_follows;
create policy "Users follow public lists" on public.list_follows
for insert to authenticated with check (
  auth.uid() = user_id and exists (
    select 1 from public.lists l where l.id = list_id and l.is_public
  )
);

drop policy if exists "Users remove own list follows" on public.list_follows;
create policy "Users remove own list follows" on public.list_follows
for delete to authenticated using (auth.uid() = user_id);
