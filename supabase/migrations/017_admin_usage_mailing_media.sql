-- TeddY production: admin roles, n8n/AI usage telemetry, mailing attachments.
-- Additive only. Does not delete or rewrite client data.

create table if not exists admin_users(
  chat_id bigint primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_usage_events(
  id bigserial primary key,
  chat_id bigint,
  workflow_id text,
  workflow_name text,
  execution_id text,
  event_type text not null check(event_type in ('execution','ai_request','vision_request','web_search')),
  provider text,
  model text,
  subscription_plan text,
  input_tokens bigint,
  output_tokens bigint,
  estimated_cost_rub numeric(14,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_events_chat_created_idx on ai_usage_events(chat_id,created_at desc);
create index if not exists ai_usage_events_type_created_idx on ai_usage_events(event_type,created_at desc);
create unique index if not exists ai_usage_events_dedupe_idx
  on ai_usage_events(execution_id,event_type,coalesce(model,''),coalesce((metadata->>'request_key'),''));

alter table if exists mailings add column if not exists media_path text;
alter table if exists mailings add column if not exists media_kind text;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('mailing-media','mailing-media',false,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public=false,
  file_size_limit=10485760,
  allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif'];
