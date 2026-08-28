-- Listener-written album reviews with Muze admin moderation.

create table if not exists public.album_review_submissions (
  id uuid primary key default gen_random_uuid(),
  album_id text not null,
  album_key text not null,
  album_title text not null,
  artist_name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  review_text text not null check (char_length(review_text) between 80 and 4000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','superseded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists album_review_submissions_album_status_idx
  on public.album_review_submissions (album_id, status, reviewed_at desc, created_at desc);

create unique index if not exists album_review_submissions_one_pending_per_user_idx
  on public.album_review_submissions (album_id, user_id)
  where status = 'pending';

alter table public.album_review_submissions enable row level security;

drop policy if exists "Approved album reviews are public" on public.album_review_submissions;
create policy "Approved album reviews are public"
on public.album_review_submissions for select
using (status = 'approved' or auth.uid() = user_id);

drop policy if exists "Listeners can submit album reviews" on public.album_review_submissions;
create policy "Listeners can submit album reviews"
on public.album_review_submissions for insert to authenticated
with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "Listeners can edit pending album reviews" on public.album_review_submissions;
create policy "Listeners can edit pending album reviews"
on public.album_review_submissions for update to authenticated
using (auth.uid() = user_id and status = 'pending')
with check (auth.uid() = user_id and status = 'pending');

grant select on public.album_review_submissions to anon, authenticated;
grant insert, update on public.album_review_submissions to authenticated;
