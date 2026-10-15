-- Программа к цели по дате (раздел кабинета «Программа»).
--
-- Здесь хранится только выбор человека и снимок анкеты на момент старта.
-- Недели, этапы и ориентиры КБЖУ в базе НЕ лежат: их однозначно считает
-- lib/goal-program.ts по этим полям и версии правил catalog_version. Так у
-- плана один источник — нет второй копии, которая разойдётся с сайтом и ботом.
--
-- Пересборка и завершение не удаляют строку: старая программа получает статус
-- archived или completed, новая создаётся отдельной строкой. Активная программа
-- у человека одна — это держит частичный уникальный индекс, поэтому двойное
-- нажатие «Начать» не создаст вторую.

create table if not exists public.nutrition_programs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  chat_id bigint,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  goal_kind text not null check (goal_kind in ('loss', 'gain', 'maintain')),
  start_day date not null,
  target_day date,
  start_weight_kg numeric(5, 1) not null check (start_weight_kg between 30 and 400),
  target_weight_kg numeric(5, 1) not null check (target_weight_kg between 30 and 400),
  -- Снимок анкеты: sex, age_years, height_cm, activity_level.
  inputs jsonb not null default '{}'::jsonb,
  catalog_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  close_reason text check (close_reason is null or close_reason in ('rebuild', 'finished', 'stopped'))
);

create unique index if not exists nutrition_programs_one_active_idx
  on public.nutrition_programs (account_id)
  where status = 'active';

create index if not exists nutrition_programs_account_idx
  on public.nutrition_programs (account_id, created_at desc);

-- Как и остальные таблицы проекта: доступ только через service_role (Б-05).
alter table public.nutrition_programs enable row level security;
