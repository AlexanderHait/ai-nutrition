-- AI-Nutrition portal: additive migration. Existing bot tables are NOT changed.
create table if not exists client_settings(
  chat_id bigint primary key,
  goal text,
  sex text,
  birth_date date,
  height_cm numeric(6,2),
  current_weight_kg numeric(6,2),
  target_weight_kg numeric(6,2),
  kcal_target numeric(8,2) default 2000,
  protein_target numeric(8,2),
  fat_target numeric(8,2),
  carb_target numeric(8,2),
  timezone text default 'Europe/Moscow',
  updated_at timestamptz not null default now()
);
create table if not exists weight_logs(
  id bigserial primary key,
  chat_id bigint not null,
  weight_kg numeric(6,2) not null,
  measured_at timestamptz not null default now()
);
create index if not exists weight_logs_chat_idx on weight_logs(chat_id,measured_at desc);
create table if not exists subscriptions(
  id bigserial primary key,
  chat_id bigint not null,
  plan text not null check(plan in ('basic','premium')),
  status text not null default 'pending' check(status in ('pending','active','past_due','cancelled','expired')),
  price_rub integer not null,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  started_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_chat_idx on subscriptions(chat_id,created_at desc);
create table if not exists payment_events(
  id bigserial primary key,
  chat_id bigint,
  provider text,
  event_type text not null,
  external_id text unique,
  amount_rub numeric(12,2),
  status text,
  payload jsonb,
  created_at timestamptz not null default now()
);
