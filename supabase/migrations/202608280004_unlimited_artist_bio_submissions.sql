-- Artist biography proposals have no maximum length; retain only the minimum.

alter table public.artist_bio_submissions
  drop constraint if exists artist_bio_submissions_bio_text_check;

alter table public.artist_bio_submissions
  add constraint artist_bio_submissions_bio_text_check
  check (char_length(bio_text) >= 150);
