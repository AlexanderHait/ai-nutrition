
-- Premium progressive maturity: features work from day one; strategic confidence matures at 7 active days.
create or replace function public.nutrition_context(_chat_id bigint, _days integer default 30)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  result jsonb;
  active_days int; active_days_7 int; meal_count int; weight_count int; profile_ok int;
  quality_score int; quality text; maturity text; today date; tz text;
begin
  select coalesce(timezone,'Europe/Moscow') into tz from public.client_settings where chat_id=_chat_id;
  tz:=coalesce(tz,'Europe/Moscow');
  today:=(now() at time zone tz)::date;

  select count(distinct eaten_day),count(*) into active_days,meal_count
  from public.meals
  where chat_id=_chat_id and deleted=false
    and eaten_day>=today-greatest(_days-1,0);

  select count(distinct eaten_day) into active_days_7
  from public.meals
  where chat_id=_chat_id and deleted=false
    and eaten_day>=today-6;

  select count(*) into weight_count
  from (select 1 from public.weight_logs where chat_id=_chat_id order by measured_at desc limit 14) q;

  select case
    when cs.goal is not null
     and cs.kcal_target is not null
     and cs.current_weight_kg is not null then 1 else 0 end
  into profile_ok
  from public.client_settings cs where cs.chat_id=_chat_id;
  profile_ok:=coalesce(profile_ok,0);

  -- No feature lock. Confidence grows progressively and reaches mature mode after 7 active days.
  maturity:=case
    when active_days>=7 then 'mature'
    when active_days>=3 then 'learning'
    else 'starter'
  end;

  quality_score:=least(
    100,
    case when meal_count>0 then 8 else 0 end
    + least(active_days,7)*8
    + least(weight_count,5)*2
    + profile_ok*26
  );

  quality:=case
    when active_days>=7 and profile_ok=1 then 'high'
    when active_days>=3 or (active_days>=1 and profile_ok=1) then 'medium'
    else 'low'
  end;

  with st as (select * from public.client_settings where chat_id=_chat_id limit 1),
  pr as (select * from public.profiles where telegram_id=_chat_id limit 1),
  tm as (
    select coalesce(sum(kcal),0) kcal,coalesce(sum(prot),0) prot,coalesce(sum(fat),0) fat,coalesce(sum(carb),0) carb,
           count(*) meals
    from public.meals where chat_id=_chat_id and deleted=false and eaten_day=today
  ),
  rm as (
    select eaten_day,sum(kcal) kcal,sum(prot) prot,sum(fat) fat,sum(carb) carb,count(*) meals
    from public.meals
    where chat_id=_chat_id and deleted=false
      and eaten_day>=today-greatest(_days-1,0)
    group by eaten_day
  ),
  rm7 as (
    select eaten_day,sum(kcal) kcal,sum(prot) prot,sum(fat) fat,sum(carb) carb,count(*) meals
    from public.meals
    where chat_id=_chat_id and deleted=false and eaten_day>=today-6
    group by eaten_day
  ),
  rm14 as (
    select eaten_day,sum(kcal) kcal,sum(prot) prot,sum(fat) fat,sum(carb) carb,count(*) meals
    from public.meals
    where chat_id=_chat_id and deleted=false and eaten_day>=today-13
    group by eaten_day
  ),
  av as (
    select round(avg(kcal),1) kcal,round(avg(prot),1) prot,round(avg(fat),1) fat,round(avg(carb),1) carb,
           round(avg(meals),1) meals from rm
  ),
  av7 as (
    select round(avg(kcal),1) kcal,round(avg(prot),1) prot,round(avg(fat),1) fat,round(avg(carb),1) carb,
           round(avg(meals),1) meals from rm7
  ),
  av14 as (
    select round(avg(kcal),1) kcal,round(avg(prot),1) prot,round(avg(fat),1) fat,round(avg(carb),1) carb,
           round(avg(meals),1) meals from rm14
  )
  select jsonb_build_object(
    'chat_id',_chat_id,
    'generated_at',now(),
    'analysis_window_days',_days,
    'data_quality',jsonb_build_object(
      'score',quality_score,
      'level',quality,
      'maturity',maturity,
      'active_days',active_days,
      'active_days_7',active_days_7,
      'mature_after_active_days',7,
      'meal_records',meal_count,
      'weight_measurements',weight_count,
      'features_available',true,
      'strategy_ready',(active_days>=7 and profile_ok=1),
      'weekly_review_mode',case when active_days>=7 then 'full' else 'partial' end
    ),
    'profile',coalesce((select to_jsonb(pr) from pr),'{}'::jsonb),
    'subscription',coalesce((select to_jsonb(ss) from (
      select plan,status,ends_at,created_at from public.subscriptions
      where chat_id=_chat_id order by created_at desc limit 1
    ) ss),'{}'::jsonb),
    'settings',coalesce((select to_jsonb(st) from st),'{}'::jsonb),
    'today',jsonb_build_object(
      'date',today,
      'eaten',coalesce((select to_jsonb(tm) from tm),'{}'::jsonb),
      'remaining',jsonb_build_object(
        'kcal',greatest(0,coalesce((select kcal_target from st),0)-coalesce((select kcal from tm),0)),
        'protein',greatest(0,coalesce((select protein_target from st),0)-coalesce((select prot from tm),0)),
        'fat',greatest(0,coalesce((select fat_target from st),0)-coalesce((select fat from tm),0)),
        'carb',greatest(0,coalesce((select carb_target from st),0)-coalesce((select carb from tm),0))
      ),
      'foods',coalesce((select jsonb_agg(to_jsonb(x) order by x.eaten_at) from (
        select dish,grams,kcal,prot,fat,carb,eaten_at
        from public.meals
        where chat_id=_chat_id and deleted=false and eaten_day=today
        order by eaten_at
      ) x),'[]'::jsonb),
      'pacing',jsonb_build_object(
        'hour',extract(hour from (now() at time zone tz))::int,
        'eaten_share',case when coalesce((select kcal_target from st),0)>0
          then round(coalesce((select kcal from tm),0)/nullif((select kcal_target from st),0),3) else null end,
        'expected_share',least(.95,greatest(.12,(extract(hour from (now() at time zone tz))-7)/15.0))
      )
    ),
    'averages',coalesce((select to_jsonb(av) from av),'{}'::jsonb),
    'averages_7',coalesce((select to_jsonb(av7) from av7),'{}'::jsonb),
    'averages_14',coalesce((select to_jsonb(av14) from av14),'{}'::jsonb),
    'preferences',coalesce(
      (select to_jsonb(pp) from public.premium_preferences pp where pp.chat_id=_chat_id limit 1),
      jsonb_build_object('notification_level','normal','morning_plan',true,'smart_nudges',true,'weekly_review',true,'post_meal_insights',true)
    ),
    'weight_trend',public.weight_trend_metrics(_chat_id),
    'food_memory',coalesce((select jsonb_agg(to_jsonb(f) order by f.use_count desc) from (
      select display_name,use_count,avg_grams,avg_kcal,avg_prot,avg_fat,avg_carb
      from public.client_food_memory where chat_id=_chat_id order by use_count desc limit 12
    ) f),'[]'::jsonb),
    'client_memory',coalesce((select jsonb_agg(to_jsonb(m) order by m.confidence desc,m.last_confirmed_at desc) from (
      select memory_type,memory_key,memory_value,confidence,source,last_confirmed_at
      from public.client_memory
      where chat_id=_chat_id and confidence>=.45
      order by confidence desc,last_confirmed_at desc limit 20
    ) m),'[]'::jsonb),
    'last_recommendations',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (
      select id,feature,recommendation_text,reason_text,feedback,feedback_reason,outcome,created_at
      from public.premium_recommendations
      where chat_id=_chat_id order by created_at desc limit 6
    ) r),'[]'::jsonb),
    'last_checkin',(select to_jsonb(c) from public.premium_checkins c where c.chat_id=_chat_id order by week_end desc limit 1)
  ) into result;

  return result;
end $$;

create or replace function public.nutrition_context_v20(_chat_id bigint,_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  base jsonb := jsonb_build_object('chat_id',_chat_id);
begin
  if to_regprocedure('public.nutrition_context(bigint,integer)') is not null then
    begin
      execute 'select public.nutrition_context($1,$2)' into base using _chat_id,_days;
      base:=coalesce(base,'{}'::jsonb);
    exception when others then
      base:=jsonb_build_object('chat_id',_chat_id,'base_context_error',sqlstate);
    end;
  end if;

  base:=base || jsonb_build_object(
    'onboarding',coalesce((select to_jsonb(o) from public.premium_onboarding o where o.chat_id=_chat_id),'{}'::jsonb),
    'adaptive_coach',coalesce((select to_jsonb(a) from public.adaptive_coach_profile a where a.chat_id=_chat_id),'{}'::jsonb),
    'subscription_lifecycle',coalesce((select to_jsonb(s) from public.subscription_lifecycle s where s.chat_id=_chat_id),'{}'::jsonb),
    'food_overrides',coalesce((
      select jsonb_agg(to_jsonb(q) order by q.use_count desc) from (
        select display_name,brand,grams,kcal,prot,fat,carb,confidence,use_count
        from public.client_food_overrides where chat_id=_chat_id
        order by use_count desc,updated_at desc limit 12
      ) q
    ),'[]'::jsonb),
    'coach_knowledge',coalesce((
      select jsonb_agg(to_jsonb(k)) from public.coach_knowledge_for_context(null,12) k
    ),'[]'::jsonb),
    'guardrails',public.nutrition_guardrails(_chat_id)
  );
  return base;
end $$;

create or replace function public.get_nutrition_context_v20(_chat_id bigint,_days integer default 30)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c jsonb; q text;
begin
  select context into c
  from public.premium_context_snapshots
  where chat_id=_chat_id and refreshed_at>=now()-interval '15 minutes';

  if c is not null then return c; end if;

  c:=public.nutrition_context_v20(_chat_id,_days);
  q:=coalesce(c#>>'{data_quality,level}','low');

  insert into public.premium_context_snapshots(chat_id,context,confidence_level,refreshed_at)
  values(_chat_id,c,q,now())
  on conflict(chat_id) do update set
    context=excluded.context,
    confidence_level=excluded.confidence_level,
    refreshed_at=now();
  return c;
end $$;

create or replace function public.premium_contexts_v20(_days integer default 30)
returns table(chat_id bigint, context jsonb)
language sql security definer set search_path=public as $$
  with premium_ids as (
    select chat_id from public.subscription_lifecycle
    where plan='premium' and state in ('trial','active','grace')
      and (current_period_end is null or current_period_end>now() or state='grace')
    union
    select chat_id from (
      select distinct on(chat_id) chat_id,created_at
      from public.subscriptions
      where plan='premium' and status='active' and (ends_at is null or ends_at>now())
      order by chat_id,created_at desc
    ) s
  )
  select p.chat_id,public.get_nutrition_context_v20(p.chat_id,_days)
  from premium_ids p;
$$;

grant execute on function public.nutrition_context(bigint,integer) to service_role;
grant execute on function public.nutrition_context_v20(bigint,integer) to service_role;
grant execute on function public.get_nutrition_context_v20(bigint,integer) to service_role;
grant execute on function public.premium_contexts_v20(integer) to service_role;

-- Derived cache only: force next Premium request to use the new maturity model.
delete from public.premium_context_snapshots;
