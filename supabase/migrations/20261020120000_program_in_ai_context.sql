-- Программа к цели в контексте AI: бот, AI-чат и Premium (утренний план,
-- подсказки, недельный разбор) получают компактный блок "program".
--
-- Все они берут контекст клиента из nutrition_context_v20 (через кэш
-- get_nutrition_context_v20 и premium_contexts_v20), поэтому блок добавлен
-- туда — правка процессов n8n не нужна.
--
-- План здесь НЕ пересчитывается: блок читает готовое расписание недель
-- nutrition_programs.plan, которое один раз посчитал lib/goal-program.ts.
-- Оценки «в плане / мимо плана» и подсказки считает только сайт; модели
-- достаточно ориентиров недели и плана по весу — дневник и вес в контексте уже есть.
--
-- Сбой блока не ломает контекст: вызов обёрнут в отдельный блок исключений,
-- при ошибке приходит {"active": false, "error": ...}, остальное работает как раньше.
--
-- Требует 20261016120000_nutrition_programs.sql.
--
-- ПЕРЕД ПРИМЕНЕНИЕМ: функции nutrition_context_v20 и link_telegram_account_v1
-- ниже — копии боевых тел от 20.10.2026 с одной вставкой. Сверь, что боевые не
-- менялись: select md5(pg_get_functiondef('public.nutrition_context_v20(bigint,integer)'::regprocedure))
-- = 'e5287e64619eb523610a734bf69432e6' и для
-- 'public.link_telegram_account_v1(uuid,bigint,text,text,text)'::regprocedure
-- = '0a4b6dd7668b79123f9dba7becb9f690'. Иначе перенеси вставку в новое тело.

create or replace function public.nutrition_program_context_v1(_chat_id bigint)
returns jsonb
language sql
stable
set search_path = public
as $$
  with program as (
    -- Программа человека — только через аккаунт, к которому сейчас привязан
    -- этот Telegram: сохранённый chat_id мог устареть после перепривязки, а
    -- программу могли создать на сайте ещё до привязки.
    select np.*
    from public.nutrition_programs np
    where np.status = 'active'
      and np.account_id = (select ca.id from public.customer_accounts ca where ca.telegram_id = _chat_id)
    order by np.created_at desc
    limit 1
  ),
  today as (
    select public.nutrition_today() as d
  ),
  current_week as (
    select w.value as w
    from program p
    cross join today t
    cross join lateral jsonb_array_elements(p.plan -> 'weeks') as w(value)
    where t.d between (w.value ->> 'startDay')::date and (w.value ->> 'endDay')::date
    limit 1
  ),
  profile as (
    select cs.kcal_target, cs.protein_target, cs.fat_target, cs.carb_target
    from public.client_settings cs
    join program p on cs.account_id = p.account_id
    limit 1
  )
  select coalesce(
    (
      select jsonb_build_object(
        'active', true,
        'goal', p.goal_kind,
        'start_day', p.start_day,
        'target_day', p.plan #>> '{summary,targetDay}',
        'end_day', p.plan #>> '{summary,endDay}',
        'start_weight_kg', p.start_weight_kg,
        'target_weight_kg', p.target_weight_kg,
        'weeks_before_target', (
          select count(*) from jsonb_array_elements(p.plan -> 'weeks') x
          where not coalesce((x ->> 'afterTarget')::boolean, false)
        ),
        'days_to_target', (p.plan #>> '{summary,targetDay}')::date - t.d,
        'finished', t.d > (p.plan #>> '{summary,endDay}')::date,
        'kcal_floor', (p.plan #>> '{summary,kcalFloor}')::int,
        'week', case when cw.w is null then null else jsonb_build_object(
          'number', (cw.w ->> 'index')::int,
          'phase', cw.w ->> 'phase',
          'title', cw.w ->> 'title',
          'start_day', cw.w ->> 'startDay',
          'end_day', cw.w ->> 'endDay',
          'after_target', (cw.w ->> 'afterTarget')::boolean,
          'kcal', (cw.w ->> 'kcal')::int,
          'protein', (cw.w ->> 'protein')::int,
          'fat', (cw.w ->> 'fat')::int,
          'carb', (cw.w ->> 'carb')::int,
          'planned_weight_start_kg', (cw.w ->> 'plannedWeightStart')::numeric,
          'planned_weight_end_kg', (cw.w ->> 'plannedWeightEnd')::numeric
        ) end,
        -- false — в профиле стоят не ориентиры этой недели: человек может нажать
        -- «Применить ориентиры недели» в разделе «Программа».
        'profile_targets_match_week', case when cw.w is null or pr.kcal_target is null then null else
          abs(pr.kcal_target - (cw.w ->> 'kcal')::numeric) < 10
          and pr.protein_target = (cw.w ->> 'protein')::numeric
          and pr.fat_target = (cw.w ->> 'fat')::numeric
          and pr.carb_target = (cw.w ->> 'carb')::numeric
        end,
        'note', case when t.d > (p.plan #>> '{summary,endDay}')::date
          then 'Программа к цели закончилась ' || (p.plan #>> '{summary,endDay}') || '. Предложи человеку завершить её и начать следующую в разделе «Программа» кабинета TeddY.'
          else 'Человек ведёт программу к цели в разделе «Программа» кабинета TeddY. Сверяй питание и вес с ориентирами этой недели и этапом. Свои калории не предлагай и цель не меняй: ориентиры меняет только сам человек — кнопками «Применить ориентиры недели» или «Пересобрать».'
        end
      )
      from program p
      cross join today t
      left join current_week cw on true
      left join profile pr on true
    ),
    jsonb_build_object('active', false)
  );
$$;

revoke execute on function public.nutrition_program_context_v1(bigint) from public, anon, authenticated;

-- Кэш контекста (premium_context_snapshots, 15 минут) сбрасывается при любом
-- изменении программы. Общий invalidate_context_trigger здесь не подходит:
-- у программы, созданной на сайте до привязки Telegram, chat_id пустой.
create or replace function public.nutrition_programs_invalidate_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  delete from public.premium_context_snapshots s
  where s.account_id = r.account_id
     or (r.chat_id is not null and s.chat_id = r.chat_id)
     or s.chat_id = (select ca.telegram_id from public.customer_accounts ca where ca.id = r.account_id);
  return r;
end $$;

revoke execute on function public.nutrition_programs_invalidate_context() from public, anon, authenticated;

drop trigger if exists nutrition_programs_invalidate_context on public.nutrition_programs;
create trigger nutrition_programs_invalidate_context
  after insert or update or delete on public.nutrition_programs
  for each row execute function public.nutrition_programs_invalidate_context();

-- nutrition_context_v20: тело перенесено без изменений из боевой базы
-- (снято 20.10.2026), добавлен только последний блок "program".
create or replace function public.nutrition_context_v20(_chat_id bigint, _days integer default 30)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare base jsonb := jsonb_build_object('chat_id',_chat_id);
begin
  if to_regprocedure('public.nutrition_context(bigint,integer)') is not null then
    begin execute 'select public.nutrition_context($1,$2)' into base using _chat_id,_days; base:=coalesce(base,'{}'::jsonb);
    exception when others then base:=jsonb_build_object('chat_id',_chat_id,'base_context_error',sqlstate); end;
  end if;
  base:=base || jsonb_build_object(
    'onboarding',coalesce((select to_jsonb(o) from public.premium_onboarding o where o.chat_id=_chat_id),'{}'::jsonb),
    'adaptive_coach',coalesce((select to_jsonb(a) from public.adaptive_coach_profile a where a.chat_id=_chat_id),'{}'::jsonb),
    'subscription_lifecycle',coalesce((select to_jsonb(s) from public.subscription_lifecycle s where s.chat_id=_chat_id),'{}'::jsonb),
    'food_overrides',coalesce((select jsonb_agg(to_jsonb(q) order by q.use_count desc) from (select display_name,brand,grams,kcal,prot,fat,carb,confidence,use_count from public.client_food_overrides where chat_id=_chat_id order by use_count desc,updated_at desc limit 12) q),'[]'::jsonb),
    'coach_knowledge',coalesce((select jsonb_agg(to_jsonb(k)) from public.coach_knowledge_for_context(null,12) k),'[]'::jsonb),
    'guardrails',public.nutrition_guardrails(_chat_id)
  );
  -- Программа к цели. Отдельный блок исключений: сбой программы не должен
  -- ломать контекст AI-чата и Premium.
  begin
    base:=base || jsonb_build_object('program',public.nutrition_program_context_v1(_chat_id));
  exception when others then
    base:=base || jsonb_build_object('program',jsonb_build_object('active',false,'error',sqlstate));
  end;
  return base;
end $function$;

-- link_telegram_account_v1: при слиянии сайта с Telegram-аккаунтом данные
-- переносятся по явному списку таблиц, а исходный аккаунт удаляется. Без этой
-- вставки программы сайта не перенеслись бы (Л-01: сборщик по явному списку
-- теряет новое), а внешний ключ on delete restrict остановил бы привязку.
-- Тело перенесено из боевой базы без изменений, добавлен только блок
-- «Программа к цели» перед переносом таблиц.
CREATE OR REPLACE FUNCTION public.link_telegram_account_v1(_auth_user_id uuid, _telegram_id bigint, _first_name text DEFAULT NULL::text, _username text DEFAULT NULL::text, _avatar_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_web public.customer_accounts%rowtype;
  v_tg public.customer_accounts%rowtype;
  v_source uuid;
  v_target uuid;
  v_table text;
  v_web_lifecycle public.subscription_lifecycle%rowtype;
  v_tg_lifecycle public.subscription_lifecycle%rowtype;
  v_web_settings public.client_settings%rowtype;
begin
  if _auth_user_id is null or not exists(select 1 from auth.users where id=_auth_user_id) then
    raise exception using errcode='22023',message='invalid auth user';
  end if;
  if _telegram_id is null or _telegram_id<=0 then
    raise exception using errcode='22023',message='invalid telegram id';
  end if;

  select * into v_web from public.customer_accounts where auth_user_id=_auth_user_id for update;
  if not found then
    raise exception using errcode='P0002',message='web account not found';
  end if;
  select * into v_tg from public.customer_accounts where telegram_id=_telegram_id for update;

  if found and v_tg.auth_user_id is not null and v_tg.auth_user_id<>_auth_user_id then
    raise exception using errcode='23505',message='telegram account is already linked';
  end if;

  if not found then
    update public.customer_accounts
       set telegram_id=_telegram_id,display_name=coalesce(nullif(trim(_first_name),''),display_name),updated_at=now()
     where id=v_web.id;
    update public.profiles
       set telegram_id=_telegram_id,
           first_name=coalesce(nullif(trim(_first_name),''),first_name),
           username=coalesce(nullif(trim(_username),''),username),
           avatar_url=coalesce(nullif(trim(_avatar_url),''),avatar_url),
           avatar_updated_at=case when nullif(trim(coalesce(_avatar_url,'')),'') is not null then now() else avatar_updated_at end
     where account_id=v_web.id;
    insert into public.account_link_events(auth_user_id,telegram_id,target_account_id,result)
    values(_auth_user_id,_telegram_id,v_web.id,'linked_new_telegram');
    return jsonb_build_object('ok',true,'account_id',v_web.id,'telegram_id',_telegram_id,'merged',false);
  end if;

  if v_tg.id=v_web.id then
    update public.profiles
       set first_name=coalesce(nullif(trim(_first_name),''),first_name),
           username=coalesce(nullif(trim(_username),''),username),
           avatar_url=coalesce(nullif(trim(_avatar_url),''),avatar_url),
           avatar_updated_at=case when nullif(trim(coalesce(_avatar_url,'')),'') is not null then now() else avatar_updated_at end
     where account_id=v_tg.id;
    insert into public.account_link_events(auth_user_id,telegram_id,target_account_id,result)
    values(_auth_user_id,_telegram_id,v_tg.id,'already_linked');
    return jsonb_build_object('ok',true,'account_id',v_tg.id,'telegram_id',_telegram_id,'merged',false);
  end if;

  v_source:=v_web.id;
  v_target:=v_tg.id;

  update public.customer_accounts set auth_user_id=null,status='merged',updated_at=now() where id=v_source;
  update public.customer_accounts
     set auth_user_id=_auth_user_id,
         email=coalesce(v_web.email,email),
         display_name=coalesce(nullif(trim(_first_name),''),v_web.display_name,display_name),
         status='active',updated_at=now()
   where id=v_target;

  update public.profiles tp
     set first_name=coalesce(nullif(trim(_first_name),''),(select wp.first_name from public.profiles wp where wp.account_id=v_source),tp.first_name),
         username=coalesce(nullif(trim(_username),''),tp.username,(select wp.username from public.profiles wp where wp.account_id=v_source)),
         locale=coalesce(tp.locale,(select wp.locale from public.profiles wp where wp.account_id=v_source)),
         avatar_url=coalesce(nullif(trim(_avatar_url),''),tp.avatar_url,(select wp.avatar_url from public.profiles wp where wp.account_id=v_source)),
         avatar_updated_at=case when nullif(trim(coalesce(_avatar_url,'')),'') is not null then now() else greatest(tp.avatar_updated_at,(select wp.avatar_updated_at from public.profiles wp where wp.account_id=v_source)) end
   where tp.account_id=v_target;
  delete from public.profiles where account_id=v_source;

  select * into v_web_settings from public.client_settings where account_id=v_source;
  if found then
    if exists(select 1 from public.client_settings where account_id=v_target) then
      update public.client_settings ts set
        goal=coalesce(v_web_settings.goal,ts.goal),
        sex=coalesce(v_web_settings.sex,ts.sex),
        birth_date=coalesce(v_web_settings.birth_date,ts.birth_date),
        height_cm=coalesce(v_web_settings.height_cm,ts.height_cm),
        current_weight_kg=coalesce(v_web_settings.current_weight_kg,ts.current_weight_kg),
        target_weight_kg=coalesce(v_web_settings.target_weight_kg,ts.target_weight_kg),
        kcal_target=coalesce(v_web_settings.kcal_target,ts.kcal_target),
        protein_target=coalesce(v_web_settings.protein_target,ts.protein_target),
        fat_target=coalesce(v_web_settings.fat_target,ts.fat_target),
        carb_target=coalesce(v_web_settings.carb_target,ts.carb_target),
        timezone=coalesce(v_web_settings.timezone,ts.timezone),
        age_years=coalesce(v_web_settings.age_years,ts.age_years),
        activity_level=coalesce(v_web_settings.activity_level,ts.activity_level),
        onboarding_source=coalesce(v_web_settings.onboarding_source,ts.onboarding_source),
        updated_at=now()
      where ts.account_id=v_target;
      delete from public.client_settings where account_id=v_source;
    else
      update public.client_settings set account_id=v_target,chat_id=_telegram_id,updated_at=now() where account_id=v_source;
    end if;
  end if;

  select * into v_web_lifecycle from public.subscription_lifecycle where account_id=v_source;
  select * into v_tg_lifecycle from public.subscription_lifecycle where account_id=v_target;
  if v_web_lifecycle.id is not null then
    if v_tg_lifecycle.id is null then
      update public.subscription_lifecycle set account_id=v_target,chat_id=_telegram_id,updated_at=now() where id=v_web_lifecycle.id;
    else
      if (v_web_lifecycle.plan='premium' and v_web_lifecycle.state in ('trial','active','grace') and coalesce(v_web_lifecycle.current_period_end,v_web_lifecycle.trial_ends_at,v_web_lifecycle.grace_ends_at,'infinity'::timestamptz)>now())
         and not (v_tg_lifecycle.plan='premium' and v_tg_lifecycle.state in ('trial','active','grace') and coalesce(v_tg_lifecycle.current_period_end,v_tg_lifecycle.trial_ends_at,v_tg_lifecycle.grace_ends_at,'infinity'::timestamptz)>now()) then
        update public.subscription_lifecycle set
          plan=v_web_lifecycle.plan,state=v_web_lifecycle.state,trial_ends_at=v_web_lifecycle.trial_ends_at,
          current_period_start=v_web_lifecycle.current_period_start,current_period_end=v_web_lifecycle.current_period_end,
          cancel_at_period_end=v_web_lifecycle.cancel_at_period_end,grace_ends_at=v_web_lifecycle.grace_ends_at,
          provider=v_web_lifecycle.provider,provider_customer_id=v_web_lifecycle.provider_customer_id,
          provider_subscription_id=v_web_lifecycle.provider_subscription_id,trial_started_at=v_web_lifecycle.trial_started_at,
          trial_used_at=coalesce(v_tg_lifecycle.trial_used_at,v_web_lifecycle.trial_used_at),updated_at=now()
        where id=v_tg_lifecycle.id;
      else
        update public.subscription_lifecycle set trial_used_at=coalesce(trial_used_at,v_web_lifecycle.trial_used_at),updated_at=now() where id=v_tg_lifecycle.id;
      end if;
      delete from public.subscription_lifecycle where id=v_web_lifecycle.id;
    end if;
  end if;

  -- Программа к цели (С-03). Активная программа у человека одна: если она
  -- есть у обоих аккаунтов, остаётся более свежая, вторая закрывается как merged.
  -- Затем все программы сайта переходят на Telegram-аккаунт — иначе удаление
  -- аккаунта ниже упрётся в внешний ключ (on delete restrict).
  if to_regclass('public.nutrition_programs') is not null then
    update public.nutrition_programs
       set status='archived',closed_at=now(),close_reason='merged',updated_at=now()
     where status='active' and account_id in (v_source,v_target)
       and id<>(select np.id from public.nutrition_programs np
                 where np.status='active' and np.account_id in (v_source,v_target)
                 order by np.created_at desc limit 1);
    update public.nutrition_programs set account_id=v_target,chat_id=_telegram_id,updated_at=now() where account_id=v_source;
  end if;

  foreach v_table in array array[
    'adaptive_coach_profile','ai_decisions','ai_insights','ai_memory','ai_profiles','ai_timeline','ai_usage_events',
    'bot_events','chat_logs','client_food_memory','client_food_overrides','client_memory','client_onboarding_sessions',
    'correction_events','digests','food_catalog_observations','food_correction_evidence','meals','meals_draft',
    'payment_events','payment_orders','premium_checkins','premium_context_snapshots','premium_daily_plans','premium_feature_events',
    'premium_nudges','premium_onboarding','premium_preferences','premium_recommendations','premium_target_proposals',
    'premium_weekly_reports','processing_jobs','recognition_events','replay_events','subscription_usage_reservations',
    'subscriptions','support_messages','support_sessions','weight_logs'
  ] loop
    if to_regclass('public.'||v_table) is not null then
      execute format('update public.%I set account_id=$1 where account_id=$2',v_table) using v_target,v_source;
    end if;
  end loop;

  update public.profiles set telegram_id=_telegram_id where account_id=v_target;
  delete from public.customer_accounts where id=v_source;

  insert into public.account_link_events(auth_user_id,telegram_id,source_account_id,target_account_id,result)
  values(_auth_user_id,_telegram_id,v_source,v_target,'merged_accounts');
  return jsonb_build_object('ok',true,'account_id',v_target,'telegram_id',_telegram_id,'merged',true);
end;
$function$;
