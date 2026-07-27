
-- 009_intelligence_layer.sql
-- V19: unified context, client memory, confidence, pacing, smoothed weight,
-- recommendation outcomes, weekly check-ins and Premium Health.

create table if not exists client_memory(
  id bigserial primary key,
  chat_id bigint not null,
  memory_type text not null check(memory_type in ('preference','avoid','constraint','pattern')),
  memory_key text not null,
  memory_value text not null,
  confidence numeric(4,3) not null default .65 check(confidence between 0 and 1),
  source text not null default 'feedback',
  last_confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(chat_id,memory_type,memory_key)
);
create index if not exists client_memory_chat_idx on client_memory(chat_id,confidence desc,last_confirmed_at desc);

create table if not exists premium_recommendations(
  id bigserial primary key,
  chat_id bigint not null,
  feature text not null,
  recommendation_text text not null,
  reason_text text,
  context_snapshot jsonb,
  feedback text check(feedback in ('useful','not_fit')),
  feedback_reason text,
  outcome text check(outcome in ('followed','ignored','unknown')),
  created_at timestamptz not null default now(),
  feedback_at timestamptz,
  outcome_at timestamptz
);
create index if not exists premium_recommendations_chat_idx on premium_recommendations(chat_id,created_at desc);
create index if not exists premium_recommendations_feedback_idx on premium_recommendations(feedback,created_at desc);

create table if not exists premium_checkins(
  id bigserial primary key,
  chat_id bigint not null,
  week_end date not null,
  hunger text not null check(hunger in ('low','normal','high')),
  energy text not null check(energy in ('low','normal','high')),
  adherence_ease text not null check(adherence_ease in ('easy','normal','hard')),
  note text,
  created_at timestamptz not null default now(),
  unique(chat_id,week_end)
);
create index if not exists premium_checkins_chat_idx on premium_checkins(chat_id,week_end desc);

create table if not exists premium_context_snapshots(
  chat_id bigint primary key,
  context jsonb not null,
  confidence_level text not null,
  refreshed_at timestamptz not null default now()
);

-- Smoothed weight trend: latest 7 measurements vs previous 7 measurements.
create or replace function weight_trend_metrics(_chat_id bigint)
returns jsonb language sql stable security definer set search_path=public as $$
with w as (
  select weight_kg::numeric as weight_kg, measured_at,
         row_number() over(order by measured_at desc) rn
  from weight_logs where chat_id=_chat_id and weight_kg is not null
  order by measured_at desc limit 14
), a as (
  select avg(weight_kg) filter(where rn between 1 and 7) latest7,
         avg(weight_kg) filter(where rn between 8 and 14) prev7,
         count(*) cnt
  from w
)
select jsonb_build_object(
 'measurements',cnt,
 'avg_latest7',round(latest7,2),
 'avg_previous7',round(prev7,2),
 'delta',case when prev7 is null then null else round(latest7-prev7,2) end
) from a;
$$;

-- One canonical context for every Premium decision.
create or replace function nutrition_context(_chat_id bigint, _days integer default 14)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  result jsonb; active_days int; meal_count int; weight_count int; profile_ok int;
  quality_score int; quality text; today date; tz text;
begin
  select coalesce(timezone,'Europe/Moscow') into tz from client_settings where chat_id=_chat_id;
  tz:=coalesce(tz,'Europe/Moscow'); today:=(now() at time zone tz)::date;

  select count(distinct eaten_day),count(*) into active_days,meal_count
  from meals where chat_id=_chat_id and deleted=false and eaten_day>=today-greatest(_days-1,0);
  select count(*) into weight_count from (select 1 from weight_logs where chat_id=_chat_id order by measured_at desc limit 14) q;
  select case when cs.goal is not null and cs.kcal_target is not null and cs.current_weight_kg is not null then 1 else 0 end
    into profile_ok from client_settings cs where cs.chat_id=_chat_id;
  profile_ok:=coalesce(profile_ok,0);
  quality_score:=least(100, active_days*6 + least(weight_count,7)*4 + profile_ok*30);
  quality:=case when quality_score>=75 then 'high' when quality_score>=45 then 'medium' else 'low' end;

  with st as (select * from client_settings where chat_id=_chat_id limit 1),
  pr as (select * from profiles where telegram_id=_chat_id limit 1),
  tm as (
    select coalesce(sum(kcal),0) kcal,coalesce(sum(prot),0) prot,coalesce(sum(fat),0) fat,coalesce(sum(carb),0) carb,
           count(*) meals
    from meals where chat_id=_chat_id and deleted=false and eaten_day=today
  ),
  rm as (
    select eaten_day,sum(kcal) kcal,sum(prot) prot,sum(fat) fat,sum(carb) carb,count(*) meals
    from meals where chat_id=_chat_id and deleted=false and eaten_day>=today-greatest(_days-1,0)
    group by eaten_day
  ),
  av as (
    select round(avg(kcal),1) kcal,round(avg(prot),1) prot,round(avg(fat),1) fat,round(avg(carb),1) carb,
           round(avg(meals),1) meals from rm
  )
  select jsonb_build_object(
    'chat_id',_chat_id,
    'generated_at',now(),
    'data_quality',jsonb_build_object('score',quality_score,'level',quality,'active_days',active_days,'meal_records',meal_count,'weight_measurements',weight_count),
    'profile',coalesce((select to_jsonb(pr) from pr),'{}'::jsonb),
    'subscription',coalesce((select to_jsonb(ss) from (select plan,status,ends_at,created_at from subscriptions where chat_id=_chat_id order by created_at desc limit 1) ss),'{}'::jsonb),
    'settings',coalesce((select to_jsonb(st) from st),'{}'::jsonb),
    'today',jsonb_build_object(
      'date',today,'eaten',coalesce((select to_jsonb(tm) from tm),'{}'::jsonb),
      'remaining',jsonb_build_object(
        'kcal',greatest(0,coalesce((select kcal_target from st),0)-coalesce((select kcal from tm),0)),
        'protein',greatest(0,coalesce((select protein_target from st),0)-coalesce((select prot from tm),0)),
        'fat',greatest(0,coalesce((select fat_target from st),0)-coalesce((select fat from tm),0)),
        'carb',greatest(0,coalesce((select carb_target from st),0)-coalesce((select carb from tm),0))
      ),
      'foods',coalesce((select jsonb_agg(to_jsonb(x) order by x.eaten_at) from
        (select dish,grams,kcal,prot,fat,carb,eaten_at from meals where chat_id=_chat_id and deleted=false and eaten_day=today order by eaten_at) x),'[]'::jsonb),
      'pacing',jsonb_build_object(
        'hour',extract(hour from (now() at time zone tz))::int,
        'eaten_share',case when coalesce((select kcal_target from st),0)>0 then round(coalesce((select kcal from tm),0)/nullif((select kcal_target from st),0),3) else null end,
        'expected_share',least(.95,greatest(.12,(extract(hour from (now() at time zone tz))-7)/15.0))
      )
    ),
    'averages',coalesce((select to_jsonb(av) from av),'{}'::jsonb),
    'preferences',coalesce((select to_jsonb(pp) from premium_preferences pp where pp.chat_id=_chat_id limit 1),jsonb_build_object('notification_level','normal','morning_plan',true,'smart_nudges',true,'weekly_review',true,'post_meal_insights',true)),
    'weight_trend',weight_trend_metrics(_chat_id),
    'food_memory',coalesce((select jsonb_agg(to_jsonb(f) order by f.use_count desc) from
      (select display_name,use_count,avg_grams,avg_kcal,avg_prot,avg_fat,avg_carb from client_food_memory where chat_id=_chat_id order by use_count desc limit 12) f),'[]'::jsonb),
    'client_memory',coalesce((select jsonb_agg(to_jsonb(m) order by m.confidence desc,m.last_confirmed_at desc) from
      (select memory_type,memory_key,memory_value,confidence,source,last_confirmed_at from client_memory where chat_id=_chat_id and confidence>=.45 order by confidence desc,last_confirmed_at desc limit 20) m),'[]'::jsonb),
    'last_recommendations',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from
      (select id,feature,recommendation_text,reason_text,feedback,feedback_reason,outcome,created_at from premium_recommendations where chat_id=_chat_id order by created_at desc limit 6) r),'[]'::jsonb),
    'last_checkin',(select to_jsonb(c) from premium_checkins c where c.chat_id=_chat_id order by week_end desc limit 1)
  ) into result;
  return result;
end $$;

create or replace function premium_contexts_v2(_days integer default 14)
returns table(chat_id bigint, context jsonb)
language sql stable security definer set search_path=public as $$
  with latest_sub as (
    select distinct on(chat_id) chat_id,plan,status,ends_at from subscriptions order by chat_id,created_at desc
  )
  select s.chat_id,nutrition_context(s.chat_id,_days)
  from latest_sub s where s.plan='premium' and s.status='active' and (s.ends_at is null or s.ends_at>now());
$$;

create or replace function refresh_premium_context(_chat_id bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c jsonb; q text;
begin
  c:=nutrition_context(_chat_id,14); q:=coalesce(c#>>'{data_quality,level}','low');
  insert into premium_context_snapshots(chat_id,context,confidence_level,refreshed_at)
  values(_chat_id,c,q,now())
  on conflict(chat_id) do update set context=excluded.context,confidence_level=excluded.confidence_level,refreshed_at=now();
  return c;
end $$;

grant execute on function nutrition_context(bigint,integer) to service_role;
grant execute on function premium_contexts_v2(integer) to service_role;
grant execute on function refresh_premium_context(bigint) to service_role;

-- Feedback automatically becomes cautious structured memory.
create or replace function learn_feedback_memory()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.feedback='not_fit' and new.feedback_reason is not null then
    insert into client_memory(chat_id,memory_type,memory_key,memory_value,confidence,source,last_confirmed_at)
    values(new.chat_id,
      case when new.feedback_reason='Не люблю эти продукты' then 'avoid' else 'constraint' end,
      lower(new.feedback_reason),new.feedback_reason,.70,'recommendation_feedback',now())
    on conflict(chat_id,memory_type,memory_key) do update set
      memory_value=excluded.memory_value,
      confidence=least(1,client_memory.confidence+.08),
      last_confirmed_at=now();
  end if;
  return new;
end $$;
drop trigger if exists trg_learn_feedback_memory on premium_recommendations;
create trigger trg_learn_feedback_memory after update of feedback on premium_recommendations
for each row when(new.feedback is not null and new.feedback is distinct from old.feedback) execute function learn_feedback_memory();
