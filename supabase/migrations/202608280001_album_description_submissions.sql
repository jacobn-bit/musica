-- Allow one moderated bio, sound, impact, and legacy submission per listener and album.

alter table public.album_review_submissions
  add column if not exists submission_type text not null default 'bio';

alter table public.album_review_submissions
  drop constraint if exists album_review_submissions_submission_type_check;

alter table public.album_review_submissions
  add constraint album_review_submissions_submission_type_check
  check (submission_type in ('bio', 'sound', 'impact', 'legacy'));

drop index if exists public.album_review_submissions_one_pending_per_user_idx;

create unique index if not exists album_review_submissions_one_pending_per_user_type_idx
  on public.album_review_submissions (album_id, user_id, submission_type)
  where status = 'pending';

create index if not exists album_review_submissions_album_type_status_idx
  on public.album_review_submissions (album_id, submission_type, status, reviewed_at desc, created_at desc);
