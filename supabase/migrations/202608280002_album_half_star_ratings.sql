-- Album ratings use ten stars and accept half-star steps from 0.5 through 10.
-- Track ratings remain on their existing integer 1–10 scale.

alter table public.ratings
  drop constraint if exists ratings_rating_check;

alter table public.ratings
  alter column rating type numeric(3,1)
  using rating::numeric(3,1);

alter table public.ratings
  add constraint ratings_rating_check
  check (rating between 0.5 and 10 and rating * 2 = trunc(rating * 2));
