-- Muze user profile/avatar storage only
-- Run this in the Supabase SQL Editor if avatar/profile saves show:
-- "Profile storage is not ready yet."

create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  avatar_url text,
  avatar_config jsonb,
  avatar_svg text,
  avatar_type text,
  skipped_avatar_setup boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_profiles add column if not exists email text;
alter table user_profiles add column if not exists username text;
alter table user_profiles add column if not exists avatar_url text;
alter table user_profiles add column if not exists avatar_config jsonb;
alter table user_profiles add column if not exists avatar_svg text;
alter table user_profiles add column if not exists avatar_type text;
alter table user_profiles add column if not exists skipped_avatar_setup boolean not null default false;
alter table user_profiles add column if not exists created_at timestamptz default now();
alter table user_profiles add column if not exists updated_at timestamptz default now();

alter table user_profiles enable row level security;

drop policy if exists "Users can read their own profile" on user_profiles;
create policy "Users can read their own profile"
on user_profiles for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own profile" on user_profiles;
create policy "Users can insert their own profile"
on user_profiles for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on user_profiles;
create policy "Users can update their own profile"
on user_profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar images" on storage.objects;
create policy "Users can upload their own avatar images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update their own avatar images" on storage.objects;
create policy "Users can update their own avatar images"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
