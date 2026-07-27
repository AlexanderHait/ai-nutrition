
-- 008_premium_coach.sql
-- Premium Coach: personalization, proactive guidance, food memory and strategy proposals.
-- Additive only.

create table if not exists premium_preferences(
  chat_id bigint primary key,
  notification_level text not null default 'normal'
    check(notification_level in ('minimal','normal','active')),
  morning_plan boolean not null default true,
  smart_nudges boolean not null default true,
  weekly_review boolean not null default true,
  post_meal_insights boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists client_food_memory(
  chat_id bigint not null,
  normalized_name text not null,
  display_name text not null,
  use_count integer not null default 1,
  avg_grams numeric(10,1),
  avg_kcal numeric(10,1),
  avg_prot numeric(10,1),
  avg_fat numeric(10,1),
  avg_carb numeric(10,1),
  last_seen_at timestamptz not null default now(),
  primary key(chat_id, normalized_name)
);
create index if not exists client_food_memory_chat_use_idx
  on client_food_memory(chat_id,use_count desc,last_seen_at desc);

create or replace function learn_client_food_memory()
returns trigger language plpgsql security definer as $$
declare n text; cnt integer;
begin
  if new.deleted is true or coalesce(new.grams,0)<=0 or coalesce(new.kcal,0)<=0 then return new; end if;
  n:=normalize_food_name(new.dish);
  if length(n)<2 then return new; end if;

  insert into client_food_memory(
    chat_id,normalized_name,display_name,use_count,avg_grams,avg_kcal,avg_prot,avg_fat,avg_carb,last_seen_at
  ) values(
    new.chat_id,n,new.dish,1,new.grams,new.kcal,new.prot,new.fat,new.carb,now()
  )
  on conflict(chat_id,normalized_name) do update set
    display_name=excluded.display_name,
    avg_grams=(coalesce(client_food_memory.avg_grams,excluded.avg_grams)*least(client_food_memory.use_count,19)+excluded.avg_grams)/(least(client_food_memory.use_count,19)+1),
    avg_kcal=(coalesce(client_food_memory.avg_kcal,excluded.avg_kcal)*least(client_food_memory.use_count,19)+excluded.avg_kcal)/(least(client_food_memory.use_count,19)+1),
    avg_prot=(coalesce(client_food_memory.avg_prot,excluded.avg_prot)*least(client_food_memory.use_count,19)+excluded.avg_prot)/(least(client_food_memory.use_count,19)+1),
    avg_fat=(coalesce(client_food_memory.avg_fat,excluded.avg_fat)*least(client_food_memory.use_count,19)+excluded.avg_fat)/(least(client_food_memory.use_count,19)+1),
    avg_carb=(coalesce(client_food_memory.avg_carb,excluded.avg_carb)*least(client_food_memory.use_count,19)+excluded.avg_carb)/(least(client_food_memory.use_count,19)+1),
    use_count=client_food_memory.use_count+1,last_seen_at=now();
  return new;
end $$;

drop trigger if exists trg_client_food_memory on meals;
create trigger trg_client_food_memory
after insert on meals for each row execute function learn_client_food_memory();

create table if not exists premium_daily_plans(
  id bigserial primary key,
  chat_id bigint not null,
  for_date date not null,
  content_md text not null,
  payload jsonb,
  created_at timestamptz not null default now(),
  unique(chat_id,for_date)
);
create index if not exists premium_daily_plans_chat_date_idx on premium_daily_plans(chat_id,for_date desc);

create table if not exists premium_weekly_reports(
  id bigserial primary key,
  chat_id bigint not null,
  week_end date not null,
  content_md text not null,
  payload jsonb,
  created_at timestamptz not null default now(),
  unique(chat_id,week_end)
);
create index if not exists premium_weekly_reports_chat_week_idx on premium_weekly_reports(chat_id,week_end desc);

create table if not exists premium_nudges(
  id bigserial primary key,
  chat_id bigint not null,
  nudge_type text not null,
  content text not null,
  for_date date not null,
  sent_at timestamptz,
  payload jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists premium_nudges_once_idx
  on premium_nudges(chat_id,nudge_type,for_date);

create table if not exists premium_target_proposals(
  id bigserial primary key,
  chat_id bigint not null,
  status text not null default 'pending'
    check(status in ('pending','applied','dismissed')),
  current_kcal numeric(8,2),
  proposed_kcal numeric(8,2),
  current_protein numeric(8,2),
  proposed_protein numeric(8,2),
  current_fat numeric(8,2),
  proposed_fat numeric(8,2),
  current_carb numeric(8,2),
  proposed_carb numeric(8,2),
  reason text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists premium_target_proposals_chat_idx
  on premium_target_proposals(chat_id,status,created_at desc);

create table if not exists premium_feature_events(
  id bigserial primary key,
  chat_id bigint not null,
  feature text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists premium_feature_events_chat_created_idx
  on premium_feature_events(chat_id,created_at desc);
create index if not exists premium_feature_events_feature_created_idx
  on premium_feature_events(feature,created_at desc);

create or replace function is_premium(_chat_id bigint)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((
    select (s.status='active' and s.plan='premium' and (s.ends_at is null or s.ends_at>now()))
    from subscriptions s where s.chat_id=_chat_id
    order by s.created_at desc limit 1
  ),false)
$$;


-- One compact RPC snapshot for n8n Premium automations.
-- Avoids loading whole tables and assembling the same context repeatedly in n8n.
create or replace function premium_contexts(_days integer default 14)
returns table(chat_id bigint, context jsonb)
language sql stable security definer set search_path=public as $$
  with latest_sub as (
    select distinct on (s.chat_id) s.chat_id,s.plan,s.status,s.ends_at
    from subscriptions s order by s.chat_id,s.created_at desc
  ),
  premium as (
    select s.chat_id from latest_sub s where s.plan='premium' and s.status='active' and (s.ends_at is null or s.ends_at>now())
  )
  select p.chat_id,
    jsonb_build_object(
      'chat_id',p.chat_id,
      'profile',(select to_jsonb(pr) from profiles pr where pr.telegram_id=p.chat_id limit 1),
      'settings',(select to_jsonb(cs) from client_settings cs where cs.chat_id=p.chat_id limit 1),
      'preferences',coalesce((select to_jsonb(pp) from premium_preferences pp where pp.chat_id=p.chat_id limit 1),'{}'::jsonb),
      'meals',coalesce((select jsonb_agg(to_jsonb(m) order by m.eaten_at desc)
        from (select id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day
              from meals where chat_id=p.chat_id and deleted=false
                and eaten_day >= (timezone('Europe/Moscow',now())::date - greatest(_days-1,0))
              order by eaten_at desc limit 500) m),'[]'::jsonb),
      'weights',coalesce((select jsonb_agg(to_jsonb(w) order by w.measured_at desc)
        from (select weight_kg,measured_at from weight_logs where chat_id=p.chat_id order by measured_at desc limit 20) w),'[]'::jsonb),
      'food_memory',coalesce((select jsonb_agg(to_jsonb(f) order by f.use_count desc)
        from (select display_name,use_count,avg_grams,avg_kcal,avg_prot,avg_fat,avg_carb,last_seen_at
              from client_food_memory where chat_id=p.chat_id order by use_count desc limit 15) f),'[]'::jsonb)
    ) as context
  from premium p;
$$;
grant execute on function premium_contexts(integer) to service_role;
