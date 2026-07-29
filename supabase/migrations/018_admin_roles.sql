-- TeddY: explicit administrator roles. Additive only.
create table if not exists public.admin_users (
  chat_id bigint primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_users_active_idx on public.admin_users(is_active) where is_active = true;
