-- Listener-proposed sets of exactly five defining tracks, moderated by Muze.

create table if not exists public.album_defining_track_submissions (
  id uuid primary key default gen_random_uuid(),
  album_id text not null,
  album_key text not null,
  album_title text not null,
  artist_name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  track_names jsonb not null check (jsonb_typeof(track_names) = 'array' and jsonb_array_length(track_names) = 5),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists album_defining_tracks_one_pending_per_user_idx
  on public.album_defining_track_submissions (album_id, user_id)
  where status = 'pending';

create index if not exists album_defining_tracks_album_status_idx
  on public.album_defining_track_submissions (album_id, status, created_at asc);

alter table public.album_defining_track_submissions enable row level security;

drop policy if exists "Listeners can read their defining track submissions" on public.album_defining_track_submissions;
create policy "Listeners can read their defining track submissions"
on public.album_defining_track_submissions for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Listeners can submit defining tracks" on public.album_defining_track_submissions;
create policy "Listeners can submit defining tracks"
on public.album_defining_track_submissions for insert to authenticated
with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "Listeners can edit pending defining tracks" on public.album_defining_track_submissions;
create policy "Listeners can edit pending defining tracks"
on public.album_defining_track_submissions for update to authenticated
using (auth.uid() = user_id and status = 'pending')
with check (auth.uid() = user_id and status = 'pending');

grant select, insert, update on public.album_defining_track_submissions to authenticated;
