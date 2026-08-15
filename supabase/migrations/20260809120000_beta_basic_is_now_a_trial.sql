-- Бесплатный Basic перестал быть бессрочным — 09.08.2026
--
-- Что было. `initialize_telegram_user_v1` при первом /start выдавала новому
-- аккаунту Basic со сроком `current_period_end = null`, то есть навсегда.
-- Это делало Basic непродаваемым: 40 фото и 20 AI-запросов в месяц были у
-- каждого, кто просто написал боту, и платить 990 ₽ было не за что.
--
-- Что стало. Тот же Basic, но на 14 дней. Логика доступа
-- (`subscription_access_account_v1`) уже умеет снимать Basic по истечении
-- `current_period_end`, поэтому по окончании срока человек сам опускается на
-- free — без задания по расписанию и без второй копии правил.
--
-- Повторной выдачи не будет: вставка идёт с `on conflict do nothing`, а
-- добивка ниже трогает только строки `free/system_default`. У человека с
-- истёкшей бетой строка остаётся `basic/beta_basic`, и под условие она не
-- подходит.

-- ── 1. Лимиты free: 3 фото и 5 AI-запросов — слишком мало, чтобы после беты
-- продолжать вести дневник. Делаем 10 и 10.
--
-- Правим саму функцию, а не таблицу `subscription_products`: там лежат
-- продаваемые тарифы, и это закреплено ограничениями (`plan in ('basic','premium')`,
-- `price_rub > 0`). Ослаблять их ради двух чисел бесплатного плана —
-- размывать смысл таблицы. Значения basic по-прежнему берутся из неё.
create or replace function public.subscription_plan_limits_v1(_plan text)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_plan text:=lower(coalesce(nullif(trim(_plan),''),'free'));
  v_photo integer;
  v_ai integer;
begin
  if v_plan='premium' then
    return jsonb_build_object('plan','premium','photo_analysis',null,'ai_request',null);
  end if;

  if v_plan not in ('free','basic') then
    v_plan:='free';
  end if;

  select sp.photo_limit, sp.ai_request_limit into v_photo, v_ai
  from public.subscription_products sp
  where sp.plan=v_plan
  limit 1;

  if v_plan='basic' then
    v_photo:=coalesce(v_photo,40);
    v_ai:=coalesce(v_ai,20);
  else
    -- Бесплатный план: столько, чтобы можно было продолжать вести дневник
    -- в лёгком режиме, а не упереться в стену на второй день.
    v_photo:=coalesce(v_photo,10);
    v_ai:=coalesce(v_ai,10);
  end if;

  return jsonb_build_object('plan',v_plan,'photo_analysis',v_photo,'ai_request',v_ai);
end $$;

revoke execute on function public.subscription_plan_limits_v1(text)
  from public, anon, authenticated;

-- ── 2. Пробный Basic на 14 дней вместо бессрочного.
-- Значения по умолчанию у аргументов сохранены как были: без них Postgres
-- отказывается заменять функцию, а вызывающая сторона может их использовать.
create or replace function public.initialize_telegram_user_v1(
  _telegram_id bigint,
  _first_name text default null,
  _username text default null,
  _locale text default 'ru'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_status text;
  v_name text := nullif(trim(coalesce(_first_name, '')), '');
  v_username text := nullif(lower(trim(leading '@' from trim(coalesce(_username, '')))), '');
  v_locale text := nullif(trim(coalesce(_locale, '')), '');
  -- Срок пробного Basic. Меняется здесь и больше нигде.
  v_beta_days constant integer := 14;
  v_beta_end timestamptz := now() + (v_beta_days || ' days')::interval;
begin
  if _telegram_id is null or _telegram_id <= 0 then
    raise exception using errcode = '22023', message = 'invalid telegram id';
  end if;

  if v_username is not null and v_username !~ '^[a-z0-9_]{5,32}$' then
    v_username := null;
  end if;

  perform pg_advisory_xact_lock(_telegram_id);

  insert into public.customer_accounts(telegram_id, display_name, status, updated_at)
  values(_telegram_id, v_name, 'active', now())
  on conflict (telegram_id) do update
  set display_name = coalesce(excluded.display_name, customer_accounts.display_name),
      updated_at = now()
  returning id, status into v_account_id, v_status;

  if v_status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'account_not_active');
  end if;

  if v_username is not null then
    update public.profiles
       set username = null
     where deleted_at is null
       and telegram_id is distinct from _telegram_id
       and lower(username) = v_username;
  end if;

  insert into public.profiles(account_id, telegram_id, first_name, username, locale, created_at)
  values(v_account_id, _telegram_id, v_name, v_username, coalesce(v_locale, 'ru'), now())
  on conflict (account_id) do update
  set telegram_id = excluded.telegram_id,
      first_name = coalesce(excluded.first_name, profiles.first_name),
      username = excluded.username,
      locale = coalesce(v_locale, profiles.locale);

  insert into public.subscription_lifecycle(
    account_id, chat_id, plan, state, current_period_start, current_period_end, provider, updated_at
  )
  values(v_account_id, _telegram_id, 'basic', 'active', now(), v_beta_end, 'beta_basic', now())
  on conflict (account_id) do nothing;

  update public.subscription_lifecycle
     set chat_id = _telegram_id,
         plan = 'basic',
         state = 'active',
         current_period_start = coalesce(current_period_start, now()),
         current_period_end = v_beta_end,
         provider = 'beta_basic',
         updated_at = now()
   where account_id = v_account_id
     and plan = 'free'
     and state = 'free'
     and coalesce(provider, 'system_default') = 'system_default';

  insert into public.subscriptions(
    account_id, chat_id, plan, status, price_rub, provider, started_at, ends_at, updated_at
  )
  select v_account_id, _telegram_id, 'basic', 'active', 0, 'beta_basic', now(), v_beta_end, now()
  where exists (
    select 1 from public.subscription_lifecycle
     where account_id = v_account_id
       and plan = 'basic'
       and state = 'active'
       and provider = 'beta_basic'
  )
  and not exists (
    select 1 from public.subscriptions
     where status = 'active'
       and (account_id = v_account_id or chat_id = _telegram_id)
  );

  insert into public.client_onboarding_sessions(chat_id, account_id, status, started_at, updated_at)
  values(_telegram_id, v_account_id, 'pending', now(), now())
  on conflict (chat_id) do update
  set account_id = excluded.account_id,
      status = 'pending',
      started_at = now(),
      completed_at = null,
      updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'account_id', v_account_id,
    'telegram_id', _telegram_id,
    'username_available', v_username is not null,
    'plan', (
      select plan from public.subscription_lifecycle
      where account_id = v_account_id
    )
  );
end $$;

revoke execute on function public.initialize_telegram_user_v1(bigint, text, text, text)
  from public, anon, authenticated;

-- ── 3. Уже выданные беты получают тот же срок, считая от своего старта.
-- Трогаем только `beta_basic`. Ручные и legacy-выдачи — это живые люди,
-- их условия не меняем.
update public.subscription_lifecycle
   set current_period_end = coalesce(current_period_start, now()) + interval '14 days',
       updated_at = now()
 where provider = 'beta_basic'
   and plan = 'basic'
   and current_period_end is null;

update public.subscriptions s
   set ends_at = coalesce(s.started_at, now()) + interval '14 days',
       updated_at = now()
 where s.provider = 'beta_basic'
   and s.status = 'active'
   and s.ends_at is null;
