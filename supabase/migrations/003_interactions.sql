-- AI-Nutrition: meaningful bot activity + client/admin support chat.
-- Additive only. Existing bot tables remain untouched.

create table if not exists bot_events(
  id bigserial primary key,
  chat_id bigint not null,
  event_type text not null,
  title text not null,
  body text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bot_events_chat_created_idx
  on bot_events(chat_id, created_at desc);

create table if not exists support_messages(
  id bigserial primary key,
  chat_id bigint not null,
  sender text not null check(sender in ('client','admin')),
  content text not null,
  created_at timestamptz not null default now(),
  read_by_admin_at timestamptz,
  read_by_client_at timestamptz
);
create index if not exists support_messages_chat_created_idx
  on support_messages(chat_id, created_at asc);
create index if not exists support_messages_admin_unread_idx
  on support_messages(sender, read_by_admin_at, created_at desc);

-- RLS is intentionally not enabled here: the Next.js portal accesses these
-- tables only through its server-side Supabase service role.
