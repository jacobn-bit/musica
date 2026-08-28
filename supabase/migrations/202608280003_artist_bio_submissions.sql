-- Listener-proposed artist biographies with Muze admin moderation.

create table if not exists public.artist_bio_submissions (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  bio_text text not null check (char_length(bio_text) >= 150),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);

create unique index if not exists artist_bio_submissions_one_pending_per_user_idx
  on public.artist_bio_submissions (artist_id, user_id)
  where status = 'pending';

create index if not exists artist_bio_submissions_artist_status_idx
  on public.artist_bio_submissions (artist_id, status, created_at asc);

alter table public.artist_bio_submissions enable row level security;

drop policy if exists "Listeners can read their artist bio submissions" on public.artist_bio_submissions;
create policy "Listeners can read their artist bio submissions"
on public.artist_bio_submissions for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Listeners can submit artist biographies" on public.artist_bio_submissions;
create policy "Listeners can submit artist biographies"
on public.artist_bio_submissions for insert to authenticated
with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "Listeners can edit pending artist biographies" on public.artist_bio_submissions;
create policy "Listeners can edit pending artist biographies"
on public.artist_bio_submissions for update to authenticated
using (auth.uid() = user_id and status = 'pending')
with check (auth.uid() = user_id and status = 'pending');

grant select, insert, update on public.artist_bio_submissions to authenticated;
