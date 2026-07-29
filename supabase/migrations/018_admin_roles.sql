-- TeddY: persistent administrator roles.
-- Additive only; does not touch client data or subscription data.

create table if not exists public.admin_users (
  chat_id bigint primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_users_active_idx
  on public.admin_users(is_active)
  where is_active = true;

alter table public.admin_users enable row level security;

-- Browser users never access this table directly.
-- Server-side service_role remains the only data path.
revoke all on table public.admin_users from anon, authenticated;
grant all on table public.admin_users to service_role;

-- Make the new table visible to PostgREST immediately.
notify pgrst, 'reload schema';
