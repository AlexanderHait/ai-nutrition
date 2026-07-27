
-- 012_v20_product_intelligence.sql
-- V20: recognition confidence, correction learning, adaptive coach,
-- replay/observability, subscription lifecycle, coach knowledge base.

create table if not exists recognition_events(
  id bigserial primary key,
  chat_id bigint not null,
  meal_id bigint,
  source text not null default 'photo',
  recognized_name text,
  brand text,
  grams numeric(10,1),
  kcal numeric(10,1),
  prot numeric(10,1),
  fat numeric(10,1),
  carb numeric(10,1),
  confidence_food numeric(4,3),
  confidence_portion numeric(4,3),
  confidence_nutrition numeric(4,3),
  needs_confirmation boolean not null default false,
  caption_used boolean not null default false,
  payload jsonb,
  latency_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists recognition_events_chat_created_idx on recognition_events(chat_id,created_at desc);
create index if not exists recognition_events_review_idx on recognition_events(needs_confirmation,created_at desc);

create table if not exists client_food_overrides(
  id bigserial primary key,
  chat_id bigint not null,
  normalized_key text not null,
  display_name text not null,
  brand text,
  grams numeric(10,1),
  kcal numeric(10,1),
  prot numeric(10,1),
  fat numeric(10,1),
  carb numeric(10,1),
  confidence numeric(4,3) not null default .85,
  source text not null default 'client_correction',
  use_count integer not null default 1,
  updated_at timestamptz not null default now(),
  unique(chat_id,normalized_key)
);
create index if not exists client_food_overrides_chat_idx on client_food_overrides(chat_id,use_count desc);

create table if not exists correction_events(
  id bigserial primary key,
  chat_id bigint not null,
  meal_id bigint,
  field text not null,
  before_value text,
  after_value text,
  source text not null default 'client',
  created_at timestamptz not null default now()
);
create index if not exists correction_events_chat_idx on correction_events(chat_id,created_at desc);

create table if not exists processing_jobs(
  id bigserial primary key,
  job_type text not null,
  chat_id bigint,
  dedupe_key text unique,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check(status in ('queued','running','done','failed','dead')),
  priority integer not null default 100,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists processing_jobs_ready_idx on processing_jobs(status,available_at,priority,created_at);

create table if not exists service_circuit_breakers(
  service text primary key,
  state text not null default 'closed' check(state in ('closed','open','half_open')),
  failure_count integer not null default 0,
  opened_at timestamptz,
  retry_after timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

create table if not exists replay_events(
  id bigserial primary key,
  event_type text not null,
  chat_id bigint,
  source_workflow text,
  source_update_id bigint,
  input_payload jsonb not null,
  status text not null default 'ready' check(status in ('ready','replayed','expired')),
  diagnostic_result jsonb,
  created_at timestamptz not null default now(),
  replayed_at timestamptz
);
create index if not exists replay_events_created_idx on replay_events(created_at desc);

create table if not exists subscription_lifecycle(
  chat_id bigint primary key,
  plan text not null default 'basic' check(plan in ('basic','premium')),
  state text not null default 'active' check(state in ('trial','active','grace','cancelled','expired')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  grace_ends_at timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  updated_at timestamptz not null default now()
);
create index if not exists subscription_lifecycle_state_idx on subscription_lifecycle(state,current_period_end);

create table if not exists premium_onboarding(
  chat_id bigint primary key,
  budget_level text,
  cooking_time text,
  meals_per_day integer,
  disliked_foods text[],
  preferred_foods text[],
  training_days text[],
  notification_level text,
  response_detail text check(response_detail in ('short','medium','detailed')),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists coach_sources(
  id bigserial primary key,
  title text not null,
  source_type text not null default 'video',
  source_ref text,
  author_label text,
  qualification_note text,
  review_status text not null default 'draft' check(review_status in ('draft','reviewed','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists coach_knowledge(
  id bigserial primary key,
  source_id bigint references coach_sources(id) on delete cascade,
  topic text not null,
  claim text not null,
  practical_rule text,
  audience text,
  caveat text,
  evidence_level text not null default 'source_claim' check(evidence_level in ('source_claim','reviewed','verified')),
  start_sec numeric(10,2),
  end_sec numeric(10,2),
  tags text[],
  approved_for_ai boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists coach_knowledge_topic_idx on coach_knowledge(topic,approved_for_ai);

create table if not exists adaptive_coach_profile(
  chat_id bigint primary key,
  preferred_message_length text not null default 'medium' check(preferred_message_length in ('short','medium','detailed')),
  effective_channels text[] not null default array['telegram']::text[],
  nudge_success_rate numeric(5,2),
  recommendation_success_rate numeric(5,2),
  preferred_scenarios text[],
  best_contact_hours integer[],
  avoid_patterns text[],
  updated_at timestamptz not null default now()
);

create or replace function enqueue_job(_job_type text,_chat_id bigint,_dedupe_key text,_payload jsonb,_priority integer default 100)
returns bigint language plpgsql security definer set search_path=public as $$
declare x bigint;
begin
 insert into processing_jobs(job_type,chat_id,dedupe_key,payload,priority)
 values(_job_type,_chat_id,_dedupe_key,coalesce(_payload,'{}'::jsonb),_priority)
 on conflict(dedupe_key) do update set payload=excluded.payload
 returning id into x;
 return x;
end $$;

create or replace function claim_jobs(_worker text,_job_type text default null,_limit integer default 10)
returns setof processing_jobs language plpgsql security definer set search_path=public as $$
begin
 return query
 with c as (
   select id from processing_jobs
   where status='queued' and available_at<=now() and (_job_type is null or _job_type='' or job_type=_job_type)
   order by priority asc,created_at asc
   for update skip locked limit greatest(1,least(_limit,50))
 )
 update processing_jobs j set status='running',locked_at=now(),locked_by=_worker,attempts=attempts+1
 from c where j.id=c.id returning j.*;
end $$;

create or replace function circuit_allows(_service text)
returns boolean language plpgsql security definer set search_path=public as $$
declare r service_circuit_breakers;
begin
 select * into r from service_circuit_breakers where service=_service;
 if not found then return true; end if;
 if r.state='closed' then return true; end if;
 if r.retry_after is not null and r.retry_after<=now() then
   update service_circuit_breakers set state='half_open',updated_at=now() where service=_service;
   return true;
 end if;
 return false;
end $$;

create or replace function circuit_report(_service text,_success boolean,_error text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
 insert into service_circuit_breakers(service,state,failure_count,last_error,updated_at)
 values(_service,case when _success then 'closed' else 'closed' end,case when _success then 0 else 1 end,_error,now())
 on conflict(service) do update set
   failure_count=case when _success then 0 else service_circuit_breakers.failure_count+1 end,
   state=case when _success then 'closed' when service_circuit_breakers.failure_count+1>=4 then 'open' else service_circuit_breakers.state end,
   opened_at=case when not _success and service_circuit_breakers.failure_count+1>=4 then now() else service_circuit_breakers.opened_at end,
   retry_after=case when not _success and service_circuit_breakers.failure_count+1>=4 then now()+interval '5 minutes' else service_circuit_breakers.retry_after end,
   last_error=_error,updated_at=now();
end $$;

create or replace function subscription_entitlement(_chat_id bigint,_feature text)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare r subscription_lifecycle;
begin
 select * into r from subscription_lifecycle where chat_id=_chat_id;
 if not found then return _feature in ('tracking','today','history','profile'); end if;
 if r.state not in ('trial','active','grace') then return _feature in ('tracking','today','history','profile'); end if;
 if r.plan='premium' then return true; end if;
 return _feature in ('tracking','today','history','profile','basic_progress');
end $$;

grant execute on function enqueue_job(text,bigint,text,jsonb,integer) to service_role;
grant execute on function claim_jobs(text,text,integer) to service_role;
grant execute on function circuit_allows(text) to service_role;
grant execute on function circuit_report(text,boolean,text) to service_role;
grant execute on function subscription_entitlement(bigint,text) to service_role;


create or replace function coach_knowledge_for_context(_topics text[] default null,_limit integer default 12)
returns table(id bigint,topic text,claim text,practical_rule text,caveat text,source_id bigint)
language sql stable security definer set search_path=public as $$
 select k.id,k.topic,k.claim,k.practical_rule,k.caveat,k.source_id
 from coach_knowledge k
 where k.approved_for_ai=true
   and (_topics is null or cardinality(_topics)=0 or k.topic=any(_topics) or k.tags && _topics)
 order by case k.evidence_level when 'verified' then 1 when 'reviewed' then 2 else 3 end,k.id desc
 limit greatest(1,least(_limit,30));
$$;
grant execute on function coach_knowledge_for_context(text[],integer) to service_role;


create or replace function nutrition_context_v20(_chat_id bigint,_days integer default 14)
returns jsonb language sql stable security definer set search_path=public as $$
 select nutrition_context(_chat_id,_days) ||
 jsonb_build_object(
   'onboarding',coalesce((select to_jsonb(o) from premium_onboarding o where o.chat_id=_chat_id),'{}'::jsonb),
   'adaptive_coach',coalesce((select to_jsonb(a) from adaptive_coach_profile a where a.chat_id=_chat_id),'{}'::jsonb),
   'subscription_lifecycle',coalesce((select to_jsonb(s) from subscription_lifecycle s where s.chat_id=_chat_id),'{}'::jsonb),
   'food_overrides',coalesce((select jsonb_agg(to_jsonb(x) order by x.use_count desc) from
      (select display_name,brand,grams,kcal,prot,fat,carb,confidence,use_count from client_food_overrides where chat_id=_chat_id order by use_count desc limit 12)x),'[]'::jsonb),
   'coach_knowledge',coalesce((select jsonb_agg(to_jsonb(k)) from coach_knowledge_for_context(null,12) k),'[]'::jsonb)
 );
$$;
grant execute on function nutrition_context_v20(bigint,integer) to service_role;

create or replace function recognition_confidence(
 _food numeric,_portion numeric,_nutrition numeric,_caption boolean default false
) returns jsonb language sql immutable as $$
 select jsonb_build_object(
  'score',round((coalesce(_food,0)*.45+coalesce(_portion,0)*.30+coalesce(_nutrition,0)*.25 + case when _caption then .05 else 0 end)::numeric,3),
  'needs_confirmation',(coalesce(_food,0)*.45+coalesce(_portion,0)*.30+coalesce(_nutrition,0)*.25 + case when _caption then .05 else 0 end)<.68
 );
$$;
grant execute on function recognition_confidence(numeric,numeric,numeric,boolean) to service_role;


create or replace function learn_meal_correction()
returns trigger language plpgsql security definer set search_path=public as $$
declare key text;
begin
 if old.dish is distinct from new.dish then
   insert into correction_events(chat_id,meal_id,field,before_value,after_value) values(new.chat_id,new.id,'dish',old.dish,new.dish);
 end if;
 if old.grams is distinct from new.grams then
   insert into correction_events(chat_id,meal_id,field,before_value,after_value) values(new.chat_id,new.id,'grams',old.grams::text,new.grams::text);
 end if;
 if old.kcal is distinct from new.kcal or old.prot is distinct from new.prot or old.fat is distinct from new.fat or old.carb is distinct from new.carb then
   insert into correction_events(chat_id,meal_id,field,before_value,after_value) values(new.chat_id,new.id,'nutrition',
     concat_ws('/',old.kcal,old.prot,old.fat,old.carb),concat_ws('/',new.kcal,new.prot,new.fat,new.carb));
 end if;
 if (old.dish,new.dish,old.grams,new.grams,old.kcal,new.kcal,old.prot,new.prot,old.fat,new.fat,old.carb,new.carb) is distinct from
    (new.dish,new.dish,new.grams,new.grams,new.kcal,new.kcal,new.prot,new.prot,new.fat,new.fat,new.carb,new.carb) then
   key:=normalize_food_name(new.dish);
   if length(key)>=2 then
    insert into client_food_overrides(chat_id,normalized_key,display_name,grams,kcal,prot,fat,carb,confidence,source,use_count,updated_at)
    values(new.chat_id,key,new.dish,new.grams,new.kcal,new.prot,new.fat,new.carb,.95,'client_correction',1,now())
    on conflict(chat_id,normalized_key) do update set
      display_name=excluded.display_name,grams=excluded.grams,kcal=excluded.kcal,prot=excluded.prot,fat=excluded.fat,carb=excluded.carb,
      confidence=greatest(client_food_overrides.confidence,.95),use_count=client_food_overrides.use_count+1,updated_at=now();
   end if;
 end if;
 return new;
end $$;
drop trigger if exists trg_learn_meal_correction on meals;
create trigger trg_learn_meal_correction after update of dish,grams,kcal,prot,fat,carb on meals
for each row execute function learn_meal_correction();


create or replace function refresh_adaptive_coach(_chat_id bigint)
returns adaptive_coach_profile language plpgsql security definer set search_path=public as $$
declare rec numeric; nug numeric; scenarios text[]; hours integer[]; outrow adaptive_coach_profile;
begin
 select case when count(*)=0 then null else round(100.0*count(*) filter(where outcome='followed')/count(*),1) end
 into rec from premium_recommendations where chat_id=_chat_id and created_at>=now()-interval '30 days';

 select case when count(*)=0 then null else round(100.0*count(*) filter(where sent_at is not null)/count(*),1) end
 into nug from premium_nudges where chat_id=_chat_id and created_at>=now()-interval '30 days';

 select array_agg(feature order by c desc) into scenarios from (
   select feature,count(*) c from premium_feature_events where chat_id=_chat_id and created_at>=now()-interval '30 days'
   group by feature order by c desc limit 5
 )q;

 select array_agg(h order by c desc) into hours from (
   select extract(hour from created_at at time zone 'Europe/Moscow')::int h,count(*) c
   from premium_recommendations where chat_id=_chat_id and feedback='useful' and created_at>=now()-interval '60 days'
   group by 1 order by c desc limit 4
 )q;

 insert into adaptive_coach_profile(chat_id,nudge_success_rate,recommendation_success_rate,preferred_scenarios,best_contact_hours,updated_at)
 values(_chat_id,nug,rec,coalesce(scenarios,'{}'),coalesce(hours,'{}'),now())
 on conflict(chat_id) do update set
  nudge_success_rate=excluded.nudge_success_rate,
  recommendation_success_rate=excluded.recommendation_success_rate,
  preferred_scenarios=excluded.preferred_scenarios,
  best_contact_hours=excluded.best_contact_hours,
  updated_at=now()
 returning * into outrow;
 return outrow;
end $$;
grant execute on function refresh_adaptive_coach(bigint) to service_role;

create or replace function mark_job_result(_id bigint,_success boolean,_error text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
 if _success then
   update processing_jobs set status='done',finished_at=now(),last_error=null where id=_id;
 else
   update processing_jobs set status=case when attempts>=4 then 'dead' else 'queued' end,
     available_at=case when attempts>=4 then available_at else now()+make_interval(secs=>least(300,power(2,attempts)::int*10)) end,
     locked_at=null,locked_by=null,last_error=left(_error,2000),finished_at=case when attempts>=4 then now() else null end
   where id=_id;
 end if;
end $$;
grant execute on function mark_job_result(bigint,boolean,text) to service_role;


create table if not exists ai_concurrency_leases(
  id bigserial primary key,
  service text not null,
  owner_key text not null unique,
  lease_until timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_concurrency_leases_service_idx on ai_concurrency_leases(service,lease_until);

create or replace function claim_ai_slot(_service text,_owner_key text,_max_slots integer default 4,_ttl_seconds integer default 45)
returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 delete from ai_concurrency_leases where lease_until<now();
 perform pg_advisory_xact_lock(hashtext('ai-slot:'||_service));
 select count(*) into n from ai_concurrency_leases where service=_service and lease_until>=now();
 if n>=greatest(1,_max_slots) then return false; end if;
 insert into ai_concurrency_leases(service,owner_key,lease_until)
 values(_service,_owner_key,now()+make_interval(secs=>greatest(10,_ttl_seconds)))
 on conflict(owner_key) do update set lease_until=excluded.lease_until;
 return true;
end $$;

create or replace function release_ai_slot(_owner_key text)
returns void language sql security definer set search_path=public as $$
 delete from ai_concurrency_leases where owner_key=_owner_key;
$$;
grant execute on function claim_ai_slot(text,text,integer,integer) to service_role;
grant execute on function release_ai_slot(text) to service_role;

create or replace function get_nutrition_context_v20(_chat_id bigint,_days integer default 14)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c jsonb; q text;
begin
 select context into c from premium_context_snapshots
 where chat_id=_chat_id and refreshed_at>=now()-interval '15 minutes';
 if c is not null then return c; end if;
 c:=nutrition_context_v20(_chat_id,_days);
 q:=coalesce(c#>>'{data_quality,level}','low');
 insert into premium_context_snapshots(chat_id,context,confidence_level,refreshed_at)
 values(_chat_id,c,q,now())
 on conflict(chat_id) do update set context=excluded.context,confidence_level=excluded.confidence_level,refreshed_at=now();
 return c;
end $$;
grant execute on function get_nutrition_context_v20(bigint,integer) to service_role;

create or replace function nutrition_guardrails(_chat_id bigint)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s client_settings; wt jsonb; age integer; flags text[]:='{}'; severity text:='normal'; delta numeric; base numeric;
begin
 select * into s from client_settings where chat_id=_chat_id limit 1;
 wt:=weight_trend_metrics(_chat_id);
 if s.birth_date is not null then age:=date_part('year',age(current_date,s.birth_date))::int; end if;
 if age is not null and age<18 then flags:=array_append(flags,'minor');severity:='restricted';end if;
 if coalesce(s.kcal_target,0)>0 and s.kcal_target<1200 then flags:=array_append(flags,'very_low_energy_target');severity:='caution';end if;
 delta:=nullif(wt->>'delta','')::numeric;base:=nullif(wt->>'avg_previous7','')::numeric;
 if delta is not null and base>0 and abs(delta/base)>.03 then flags:=array_append(flags,'rapid_weight_change');severity:='caution';end if;
 return jsonb_build_object('severity',severity,'flags',flags,
   'instruction',case when severity='restricted' then 'Не давать агрессивные рекомендации по снижению/набору; использовать нейтральные образовательные ответы и рекомендовать участие взрослого/профильного специалиста при необходимости.'
                      when severity='caution' then 'Не усиливать дефицит/профицит автоматически; не менять цели без подтверждения; избегать категоричных медицинских выводов.'
                      else 'standard' end);
end $$;
grant execute on function nutrition_guardrails(bigint) to service_role;

-- Replace V20 context with cached/guardrailed variant payload.
create or replace function nutrition_context_v20(_chat_id bigint,_days integer default 14)
returns jsonb language sql stable security definer set search_path=public as $$
 select nutrition_context(_chat_id,_days) ||
 jsonb_build_object(
   'onboarding',coalesce((select to_jsonb(o) from premium_onboarding o where o.chat_id=_chat_id),'{}'::jsonb),
   'adaptive_coach',coalesce((select to_jsonb(a) from adaptive_coach_profile a where a.chat_id=_chat_id),'{}'::jsonb),
   'subscription_lifecycle',coalesce((select to_jsonb(s) from subscription_lifecycle s where s.chat_id=_chat_id),'{}'::jsonb),
   'food_overrides',coalesce((select jsonb_agg(to_jsonb(x) order by x.use_count desc) from
      (select display_name,brand,grams,kcal,prot,fat,carb,confidence,use_count from client_food_overrides where chat_id=_chat_id order by use_count desc limit 12)x),'[]'::jsonb),
   'coach_knowledge',coalesce((select jsonb_agg(to_jsonb(k)) from coach_knowledge_for_context(null,12) k),'[]'::jsonb),
   'guardrails',nutrition_guardrails(_chat_id)
 );
$$;


create table if not exists telegram_update_duplicates(
  id bigserial primary key,
  update_id bigint not null,
  chat_id bigint,
  update_kind text,
  detected_at timestamptz not null default now()
);
create index if not exists telegram_update_duplicates_detected_idx on telegram_update_duplicates(detected_at desc);

create or replace function claim_telegram_update(_update_id bigint,_chat_id bigint default null,_kind text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare inserted boolean;
begin
 if _update_id is null then return true; end if;
 insert into telegram_updates_processed(update_id,chat_id,update_kind)
 values(_update_id,_chat_id,_kind) on conflict(update_id) do nothing;
 inserted:=found;
 if not inserted then
   insert into telegram_update_duplicates(update_id,chat_id,update_kind) values(_update_id,_chat_id,_kind);
 end if;
 return inserted;
end $$;
grant execute on function claim_telegram_update(bigint,bigint,text) to service_role;


create or replace function premium_contexts_v20(_days integer default 14)
returns table(chat_id bigint, context jsonb)
language sql security definer set search_path=public as $$
 with premium_ids as (
   select distinct chat_id from (
     select chat_id from subscription_lifecycle
      where plan='premium' and state in ('trial','active','grace')
        and (current_period_end is null or current_period_end>now() or state='grace')
     union
     select distinct on(chat_id) chat_id from subscriptions
      where plan='premium' and status='active' and (ends_at is null or ends_at>now())
      order by chat_id,created_at desc
   )x
 )
 select p.chat_id,get_nutrition_context_v20(p.chat_id,_days) from premium_ids p;
$$;
grant execute on function premium_contexts_v20(integer) to service_role;


-- Invalidate cached intelligence whenever context-relevant user data changes.
drop trigger if exists settings_invalidate_context on client_settings;
create trigger settings_invalidate_context after insert or update or delete on client_settings
for each row execute function invalidate_context_trigger();

drop trigger if exists onboarding_invalidate_context on premium_onboarding;
create trigger onboarding_invalidate_context after insert or update or delete on premium_onboarding
for each row execute function invalidate_context_trigger();

drop trigger if exists memory_invalidate_context on client_memory;
create trigger memory_invalidate_context after insert or update or delete on client_memory
for each row execute function invalidate_context_trigger();

drop trigger if exists override_invalidate_context on client_food_overrides;
create trigger override_invalidate_context after insert or update or delete on client_food_overrides
for each row execute function invalidate_context_trigger();

drop trigger if exists checkin_invalidate_context on premium_checkins;
create trigger checkin_invalidate_context after insert or update or delete on premium_checkins
for each row execute function invalidate_context_trigger();

create or replace function invalidate_profile_context_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 delete from premium_context_snapshots where chat_id=coalesce(new.telegram_id,old.telegram_id);
 return coalesce(new,old);
end $$;
drop trigger if exists profile_invalidate_context on profiles;
create trigger profile_invalidate_context after insert or update or delete on profiles
for each row execute function invalidate_profile_context_trigger();


drop trigger if exists lifecycle_invalidate_context on subscription_lifecycle;
create trigger lifecycle_invalidate_context after insert or update or delete on subscription_lifecycle
for each row execute function invalidate_context_trigger();

drop trigger if exists subscriptions_invalidate_context on subscriptions;
create trigger subscriptions_invalidate_context after insert or update or delete on subscriptions
for each row execute function invalidate_context_trigger();


create or replace function refresh_subscription_states()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer:=0; x integer;
begin
 update subscription_lifecycle set state='expired',updated_at=now()
 where state='trial' and trial_ends_at is not null and trial_ends_at<now();
 get diagnostics x=row_count;n:=n+x;

 update subscription_lifecycle set state='grace',grace_ends_at=coalesce(grace_ends_at,now()+interval '3 days'),updated_at=now()
 where state='active' and current_period_end is not null and current_period_end<now() and cancel_at_period_end=false;
 get diagnostics x=row_count;n:=n+x;

 update subscription_lifecycle set state='expired',updated_at=now()
 where state='grace' and grace_ends_at is not null and grace_ends_at<now();
 get diagnostics x=row_count;n:=n+x;

 update subscription_lifecycle set state='cancelled',updated_at=now()
 where state='active' and cancel_at_period_end=true and current_period_end is not null and current_period_end<now();
 get diagnostics x=row_count;n:=n+x;
 return n;
end $$;
grant execute on function refresh_subscription_states() to service_role;
