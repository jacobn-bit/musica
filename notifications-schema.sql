-- Bell notifications for account activity such as comment likes.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  notification_type text not null,
  entity_type text,
  entity_id uuid,
  album_ref text,
  album_title text,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create unique index if not exists notifications_unique_activity_idx
on notifications (recipient_id, actor_id, notification_type, entity_id);

create index if not exists notifications_recipient_created_idx
on notifications (recipient_id, created_at desc);

alter table notifications enable row level security;

drop policy if exists "Users can read their own notifications" on notifications;
create policy "Users can read their own notifications"
on notifications for select
to authenticated
using (auth.uid() = recipient_id);

drop policy if exists "Users can create notifications for their actions" on notifications;
create policy "Users can create notifications for their actions"
on notifications for insert
to authenticated
with check (auth.uid() = actor_id and recipient_id <> auth.uid());

drop policy if exists "Users can mark their own notifications read" on notifications;
create policy "Users can mark their own notifications read"
on notifications for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);
