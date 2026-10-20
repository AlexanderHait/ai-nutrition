-- Программа к цели по дате (раздел кабинета «Программа»).
--
-- Здесь хранится выбор человека, снимок анкеты на момент старта и готовое
-- расписание недель (plan). Расписание один раз считает lib/goal-program.ts
-- при старте или пересборке; дальше его читают все — страница кабинета, бот и
-- недельный разбор (nutrition_program_context_v1). Копия одна: никто не
-- пересчитывает план заново, поэтому сайт и бот не расходятся, а уже идущая
-- программа не меняется от правок кода.
--
-- Пересборка и завершение не удаляют строку: старая программа получает статус
-- archived или completed, новая создаётся отдельной строкой. Активная программа
-- у человека одна — это держит частичный уникальный индекс, поэтому двойное
-- нажатие «Начать» не создаст вторую.

create table if not exists public.nutrition_programs (
  id uuid primary key default gen_random_uuid(),
  -- Как у остальных таблиц: удаление аккаунта с программами — громкая ошибка, а
  -- не тихая потеря (слияние аккаунтов переносит программы, см. 20261020120000).
  account_id uuid not null references public.customer_accounts(id) on update cascade on delete restrict,
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
  -- {weeks: [...], phases: [...], summary: {...}} — вывод buildProgram.
  plan jsonb not null check (
    case when jsonb_typeof(plan -> 'weeks') = 'array' and jsonb_typeof(plan -> 'summary') = 'object'
      then jsonb_array_length(plan -> 'weeks') > 0
      else false end
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  close_reason text check (close_reason is null or close_reason in ('rebuild', 'finished', 'stopped', 'merged'))
);

create unique index if not exists nutrition_programs_one_active_idx
  on public.nutrition_programs (account_id)
  where status = 'active';

-- Бот ищет программу по Telegram (chat_id).
create index if not exists nutrition_programs_active_chat_idx
  on public.nutrition_programs (chat_id)
  where status = 'active' and chat_id is not null;

create index if not exists nutrition_programs_account_idx
  on public.nutrition_programs (account_id, created_at desc);

-- Как и остальные таблицы проекта: доступ только через service_role (Б-05).
alter table public.nutrition_programs enable row level security;
