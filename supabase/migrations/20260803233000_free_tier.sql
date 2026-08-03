-- Бесплатный уровень.
--
-- Было: любой, у кого нет premium, считался basic с лимитами 10 фото и 20 AI
-- в месяц. Новому пользователю триггер сразу выдавал активный basic. То есть
-- покупать basic было незачем — его и так давали бесплатно.
--
-- Стало: три уровня.
--   free    — 3 фото-анализа и 5 AI-запросов в месяц, дневник и статистика
--   basic   — 10 фото и 20 AI, покупается
--   premium — без лимитов, покупается, есть пробные 3 дня
--
-- Признак «оплачено» — provider в subscription_lifecycle. Автоматически
-- созданная строка помечается system_default и считается free.
-- Существующие пользователи не затронуты: их строки помечаются legacy_basic
-- и продолжают работать как basic.

-- 1. Существующие basic-пользователи остаются basic.
update public.subscription_lifecycle
   set provider='legacy_basic', updated_at=now()
 where plan='basic'
   and (provider is null or provider='system_default');

-- 2. Лимиты уровней.
create or replace function public.subscription_plan_limits_v1(_plan text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
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
    v_photo:=coalesce(v_photo,10);
    v_ai:=coalesce(v_ai,20);
  else
    v_photo:=coalesce(v_photo,3);
    v_ai:=coalesce(v_ai,5);
  end if;

  return jsonb_build_object('plan',v_plan,'photo_analysis',v_photo,'ai_request',v_ai);
end;
$function$;

-- 3. Новый пользователь заводится без подписки.
create or replace function public.assign_default_subscription_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_plan text;
  v_state text;
  v_started_at timestamptz := coalesce(new.created_at, now());
  v_ends_at timestamptz;
  v_provider text;
begin
  -- Уже купленная или перенесённая подписка уважается.
  select
    case when s.plan='premium' and s.status='active' and (s.ends_at is null or s.ends_at>now()) then 'premium' else 'basic' end,
    'active',
    coalesce(s.started_at,s.created_at,v_started_at),
    s.ends_at
  into v_plan,v_state,v_started_at,v_ends_at
  from public.subscriptions s
  where s.account_id=new.account_id
     or (new.telegram_id is not null and s.chat_id=new.telegram_id)
  order by s.created_at desc nulls last, s.id desc
  limit 1;

  if found then
    v_provider := case when v_plan='premium' then 'legacy_sync' else 'legacy_basic' end;
  else
    -- Ничего не куплено: бесплатный уровень, строка в subscriptions не заводится.
    v_plan := 'free';
    v_state := 'free';
    v_started_at := coalesce(new.created_at, now());
    v_ends_at := null;
    v_provider := 'system_default';
  end if;

  insert into public.subscription_lifecycle(
    account_id,chat_id,plan,state,current_period_start,current_period_end,provider,updated_at
  ) values(
    new.account_id,new.telegram_id,v_plan,v_state,v_started_at,
    case when v_plan='premium' then v_ends_at else null end,
    v_provider,
    now()
  )
  on conflict(account_id) do nothing;

  return new;
end;
$function$;

-- 4. Разбор доступа по account_id.
create or replace function public.subscription_access_account_v1(_account_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  r public.subscription_lifecycle%rowtype;
  v_has_lifecycle boolean:=false;
  v_chat bigint;
  v_now timestamptz:=now();
  v_period_start timestamptz;
  v_reset_at timestamptz;
  v_premium boolean:=false;
  v_state text:='free';
  v_plan text:='free';
  v_photo_legacy bigint:=0;
  v_ai_legacy bigint:=0;
  v_photo_quota bigint:=0;
  v_ai_quota bigint:=0;
  v_photo_pending bigint:=0;
  v_ai_pending bigint:=0;
  v_photo_used bigint:=0;
  v_ai_used bigint:=0;
  v_photo_limit integer;
  v_ai_limit integer;
  v_limits jsonb;
  v_trial_available boolean:=true;
begin
  select ca.telegram_id into v_chat
  from public.customer_accounts ca
  where ca.id=_account_id and ca.status='active';
  if not found then
    raise exception using errcode='P0002',message='account not found';
  end if;

  v_period_start := (date_trunc('month',timezone('Europe/Moscow',v_now)) at time zone 'Europe/Moscow');
  v_reset_at := ((date_trunc('month',timezone('Europe/Moscow',v_now))+interval '1 month') at time zone 'Europe/Moscow');

  select * into r from public.subscription_lifecycle where account_id=_account_id;
  v_has_lifecycle:=found;

  if v_has_lifecycle then
    v_trial_available:=r.trial_used_at is null;
    v_premium:=r.plan='premium' and (
      (r.state='trial' and coalesce(r.trial_ends_at,r.current_period_end)>v_now)
      or (r.state='active' and (r.current_period_end is null or r.current_period_end>v_now))
      or (r.state='grace' and coalesce(r.grace_ends_at,r.current_period_end)>v_now)
    );
    if v_premium then
      v_plan:='premium';
      v_state:=r.state;
    elsif r.plan='basic'
      and r.state in ('active','grace')
      and coalesce(r.provider,'system_default')<>'system_default'
      and (r.current_period_end is null or r.current_period_end>v_now) then
      v_plan:='basic';
      v_state:=r.state;
    end if;
  end if;

  v_limits:=public.subscription_plan_limits_v1(v_plan);
  v_photo_limit:=case when v_premium then null else (v_limits->>'photo_analysis')::integer end;
  v_ai_limit:=case when v_premium then null else (v_limits->>'ai_request')::integer end;

  if v_chat is not null then
    select count(*) into v_photo_legacy
    from public.recognition_events
    where chat_id=v_chat and created_at>=v_period_start;

    select count(*) into v_ai_legacy
    from public.ai_usage_events
    where chat_id=v_chat and created_at>=v_period_start
      and lower(coalesce(request_type,feature,'')) in (
        'ai','ai_request','llm','completion','openai','text','recommend','why','shop','restaurant','quick','training','sweet','overate'
      );

    select
      count(*) filter (
        where feature='photo_analysis'
          and (status='committed' or (status='reserved' and reserved_at>=v_now-interval '15 minutes'))
      ),
      count(*) filter (
        where feature='ai_request'
          and (status='committed' or (status='reserved' and reserved_at>=v_now-interval '15 minutes'))
      ),
      count(*) filter (
        where feature='photo_analysis' and status='reserved' and reserved_at>=v_now-interval '15 minutes'
      ),
      count(*) filter (
        where feature='ai_request' and status='reserved' and reserved_at>=v_now-interval '15 minutes'
      )
    into v_photo_quota,v_ai_quota,v_photo_pending,v_ai_pending
    from public.subscription_usage_reservations
    where chat_id=v_chat and reserved_at>=v_period_start;

    v_photo_used:=greatest(v_photo_legacy,v_photo_quota);
    v_ai_used:=greatest(v_ai_legacy,v_ai_quota);
  end if;

  return jsonb_build_object(
    'account_id',_account_id,
    'chat_id',v_chat,
    'plan',v_plan,
    'state',v_state,
    'premium',v_premium,
    'trial_available',v_trial_available and not v_premium,
    'trial_used_at',case when v_has_lifecycle then r.trial_used_at else null end,
    'trial_ends_at',case when v_premium and r.state='trial' then coalesce(r.trial_ends_at,r.current_period_end) else null end,
    'current_period_end',case when v_has_lifecycle then r.current_period_end else null end,
    'provider',case when v_has_lifecycle then coalesce(r.provider,'system_default') else 'system_default' end,
    'period_start',v_period_start,
    'reset_at',v_reset_at,
    'limits',jsonb_build_object('photo_analysis',v_photo_limit,'ai_request',v_ai_limit),
    'usage',jsonb_build_object('photo_analysis',v_photo_used,'ai_request',v_ai_used),
    'pending',jsonb_build_object('photo_analysis',v_photo_pending,'ai_request',v_ai_pending),
    'remaining',jsonb_build_object(
      'photo_analysis',case when v_premium then null else greatest(v_photo_limit-v_photo_used::integer,0) end,
      'ai_request',case when v_premium then null else greatest(v_ai_limit-v_ai_used::integer,0) end
    ),
    'can_photo_analysis',v_premium or v_photo_used<v_photo_limit,
    'can_ai_request',v_premium or v_ai_used<v_ai_limit,
    'usage_mode','atomic_quota_v2'
  );
end;
$function$;

-- 5. Тот же разбор по chat_id — им пользуется бот.
create or replace function public.subscription_access_v1(_chat_id bigint)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  r public.subscription_lifecycle%rowtype;
  v_has_lifecycle boolean:=false;
  v_now timestamptz:=now();
  v_period_start timestamptz;
  v_reset_at timestamptz;
  v_premium boolean:=false;
  v_state text:='free';
  v_plan text:='free';
  v_photo_legacy bigint:=0;
  v_ai_legacy bigint:=0;
  v_photo_quota bigint:=0;
  v_ai_quota bigint:=0;
  v_photo_pending bigint:=0;
  v_ai_pending bigint:=0;
  v_photo_used bigint:=0;
  v_ai_used bigint:=0;
  v_photo_limit integer;
  v_ai_limit integer;
  v_limits jsonb;
  v_trial_available boolean:=true;
begin
  if _chat_id is null or _chat_id<=0 then
    raise exception using errcode='22023',message='invalid chat id';
  end if;

  v_period_start := (date_trunc('month',timezone('Europe/Moscow',v_now)) at time zone 'Europe/Moscow');
  v_reset_at := ((date_trunc('month',timezone('Europe/Moscow',v_now))+interval '1 month') at time zone 'Europe/Moscow');

  select * into r from public.subscription_lifecycle where chat_id=_chat_id;
  v_has_lifecycle:=found;

  if v_has_lifecycle then
    v_trial_available:=r.trial_used_at is null;
    v_premium:=r.plan='premium' and (
      (r.state='trial' and coalesce(r.trial_ends_at,r.current_period_end)>v_now)
      or (r.state='active' and (r.current_period_end is null or r.current_period_end>v_now))
      or (r.state='grace' and coalesce(r.grace_ends_at,r.current_period_end)>v_now)
    );
    if v_premium then
      v_plan:='premium';
      v_state:=r.state;
    elsif r.plan='basic'
      and r.state in ('active','grace')
      and coalesce(r.provider,'system_default')<>'system_default'
      and (r.current_period_end is null or r.current_period_end>v_now) then
      v_plan:='basic';
      v_state:=r.state;
    end if;
  end if;

  v_limits:=public.subscription_plan_limits_v1(v_plan);
  v_photo_limit:=case when v_premium then null else (v_limits->>'photo_analysis')::integer end;
  v_ai_limit:=case when v_premium then null else (v_limits->>'ai_request')::integer end;

  select count(*) into v_photo_legacy
  from public.recognition_events
  where chat_id=_chat_id and created_at>=v_period_start;

  select count(*) into v_ai_legacy
  from public.ai_usage_events
  where chat_id=_chat_id and created_at>=v_period_start
    and lower(coalesce(request_type,feature,'')) in (
      'ai','ai_request','llm','completion','openai','text','recommend','why','shop','restaurant','quick','training','sweet','overate'
    );

  select
    count(*) filter (
      where feature='photo_analysis'
        and (status='committed' or (status='reserved' and reserved_at>=v_now-interval '15 minutes'))
    ),
    count(*) filter (
      where feature='ai_request'
        and (status='committed' or (status='reserved' and reserved_at>=v_now-interval '15 minutes'))
    ),
    count(*) filter (
      where feature='photo_analysis' and status='reserved' and reserved_at>=v_now-interval '15 minutes'
    ),
    count(*) filter (
      where feature='ai_request' and status='reserved' and reserved_at>=v_now-interval '15 minutes'
    )
  into v_photo_quota,v_ai_quota,v_photo_pending,v_ai_pending
  from public.subscription_usage_reservations
  where chat_id=_chat_id and reserved_at>=v_period_start;

  v_photo_used:=greatest(v_photo_legacy,v_photo_quota);
  v_ai_used:=greatest(v_ai_legacy,v_ai_quota);

  return jsonb_build_object(
    'chat_id',_chat_id,
    'plan',v_plan,
    'state',v_state,
    'premium',v_premium,
    'trial_available',v_trial_available and not v_premium,
    'trial_used_at',case when v_has_lifecycle then r.trial_used_at else null end,
    'trial_ends_at',case when v_premium and r.state='trial' then coalesce(r.trial_ends_at,r.current_period_end) else null end,
    'current_period_end',case when v_has_lifecycle then r.current_period_end else null end,
    'provider',case when v_has_lifecycle then coalesce(r.provider,'system_default') else 'system_default' end,
    'period_start',v_period_start,
    'reset_at',v_reset_at,
    'limits',jsonb_build_object('photo_analysis',v_photo_limit,'ai_request',v_ai_limit),
    'usage',jsonb_build_object('photo_analysis',v_photo_used,'ai_request',v_ai_used),
    'pending',jsonb_build_object('photo_analysis',v_photo_pending,'ai_request',v_ai_pending),
    'remaining',jsonb_build_object(
      'photo_analysis',case when v_premium then null else greatest(v_photo_limit-v_photo_used::integer,0) end,
      'ai_request',case when v_premium then null else greatest(v_ai_limit-v_ai_used::integer,0) end
    ),
    'can_photo_analysis',v_premium or v_photo_used<v_photo_limit,
    'can_ai_request',v_premium or v_ai_used<v_ai_limit,
    'usage_mode','atomic_quota_v2'
  );
end;
$function$;
