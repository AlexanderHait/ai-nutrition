-- Напоминание о конце пробного Basic — 09.08.2026
--
-- Бета длится 14 дней и заканчивается молча: человек просто однажды упирается
-- в лимит и не понимает, что изменилось. Это худший момент из возможных —
-- ровно тогда, когда он готов был платить, он получает отказ без объяснения.
--
-- Задача решается одним ежедневным запросом, без опроса и лишних выполнений.

create table if not exists public.subscription_notices (
  id bigserial primary key,
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  kind text not null check (kind in ('trial_ending', 'trial_ended')),
  sent_at timestamptz not null default now(),
  unique (account_id, kind)
);

-- Доступ, как и у остальных таблиц проекта, только через service_role.
alter table public.subscription_notices enable row level security;

-- Выдаёт список тех, кому пора написать, и в том же запросе помечает их
-- отправленными. Двойной вызов (повторный запуск задания, ретрай сети) второй
-- раз никого не вернёт — защита от дублей не в коде отправки, а в самом отборе.
--
-- `_claim = false` — сухой прогон: показывает список и ничего не помечает.
create or replace function public.claim_subscription_trial_notices_v1(
  _days_before integer default 3,
  _limit integer default 200,
  _claim boolean default true
)
returns table(
  account_id uuid,
  chat_id bigint,
  display_name text,
  kind text,
  ends_at timestamptz,
  days_left integer
)
language plpgsql
security definer
set search_path = public
as $$
-- Имена выходных полей (account_id, kind, ...) совпадают с именами колонок.
-- Без этой директивы Postgres не знает, что имелось в виду, и падает на
-- «column reference is ambiguous». Колонка — всегда правильный ответ здесь.
#variable_conflict use_column
declare
  v_days integer := greatest(1, least(coalesce(_days_before, 3), 30));
  v_limit integer := greatest(1, least(coalesce(_limit, 200), 1000));
begin
  return query
  with due as (
    select
      sl.account_id,
      sl.chat_id,
      ca.display_name,
      sl.current_period_end as ends_at,
      -- Срок ещё не вышел — предупреждаем. Уже вышел — объясняем, что изменилось.
      case when sl.current_period_end > now() then 'trial_ending' else 'trial_ended' end as kind
    from public.subscription_lifecycle sl
    join public.customer_accounts ca
      on ca.id = sl.account_id and ca.status = 'active'
    where sl.provider = 'beta_basic'
      and sl.plan = 'basic'
      and sl.state = 'active'
      and sl.chat_id is not null
      and sl.current_period_end is not null
      -- Окно: от «осталось _days_before дней» до «закончилось два дня назад».
      -- Оплатившие сюда не попадают: у них provider уже не beta_basic.
      and sl.current_period_end > now() - interval '2 days'
      and sl.current_period_end < now() + (v_days || ' days')::interval
      and exists (
        select 1 from public.profiles p
        where p.account_id = sl.account_id and p.deleted_at is null
      )
  ),
  fresh as (
    select d.*
    from due d
    where not exists (
      select 1 from public.subscription_notices n
      where n.account_id = d.account_id and n.kind = d.kind
    )
    order by d.ends_at
    limit v_limit
  ),
  claimed as (
    insert into public.subscription_notices(account_id, kind)
    select f.account_id, f.kind from fresh f where _claim
    on conflict (account_id, kind) do nothing
    returning subscription_notices.account_id, subscription_notices.kind
  )
  select
    f.account_id,
    f.chat_id,
    f.display_name,
    f.kind,
    f.ends_at,
    greatest(0, (f.ends_at::date - now()::date))::integer as days_left
  from fresh f
  where not _claim
     or exists (select 1 from claimed c where c.account_id = f.account_id and c.kind = f.kind);
end $$;

revoke execute on function public.claim_subscription_trial_notices_v1(integer, integer, boolean)
  from public, anon, authenticated;
