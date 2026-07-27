
-- 011_reliability_layer.sql
create table if not exists system_events(
 id bigserial primary key, event_type text not null, severity text not null default 'info',
 workflow text, chat_id bigint, update_id bigint, message text, details jsonb,
 created_at timestamptz not null default now()
);
create index if not exists system_events_created_idx on system_events(created_at desc);
create index if not exists system_events_errors_idx on system_events(created_at desc) where severity in ('error','critical');

create table if not exists ai_usage_events(
 id bigserial primary key, chat_id bigint, feature text not null, model text,
 success boolean not null default true, latency_ms integer, estimated_input_tokens integer,
 estimated_output_tokens integer, created_at timestamptz not null default now()
);
create index if not exists ai_usage_chat_day_idx on ai_usage_events(chat_id,created_at desc);
create index if not exists ai_usage_created_idx on ai_usage_events(created_at desc);

create or replace function premium_ai_budget_ok(_chat_id bigint,_daily_limit integer default 30)
returns boolean language sql stable security definer set search_path=public as $$
 select count(*) < greatest(1,_daily_limit) from ai_usage_events
 where chat_id=_chat_id and created_at >= date_trunc('day',now());
$$;
grant execute on function premium_ai_budget_ok(bigint,integer) to service_role;

create or replace function log_system_event(_event_type text,_severity text default 'info',_workflow text default null,_chat_id bigint default null,_update_id bigint default null,_message text default null,_details jsonb default null)
returns bigint language plpgsql security definer set search_path=public as $$
declare x bigint; begin
 insert into system_events(event_type,severity,workflow,chat_id,update_id,message,details)
 values(_event_type,coalesce(_severity,'info'),_workflow,_chat_id,_update_id,left(_message,1000),_details) returning id into x; return x;
end $$;
grant execute on function log_system_event(text,text,text,bigint,bigint,text,jsonb) to service_role;

create or replace function invalidate_premium_context(_chat_id bigint)
returns void language sql security definer set search_path=public as $$
 delete from premium_context_snapshots where chat_id=_chat_id;
$$;
grant execute on function invalidate_premium_context(bigint) to service_role;

-- Context snapshots are invalidated by changes that materially affect nutrition decisions.
create or replace function invalidate_context_trigger() returns trigger language plpgsql security definer set search_path=public as $$
begin delete from premium_context_snapshots where chat_id=coalesce(new.chat_id,old.chat_id); return coalesce(new,old); end $$;
drop trigger if exists meals_invalidate_context on meals;
create trigger meals_invalidate_context after insert or update or delete on meals for each row execute function invalidate_context_trigger();
drop trigger if exists weights_invalidate_context on weight_logs;
create trigger weights_invalidate_context after insert or update or delete on weight_logs for each row execute function invalidate_context_trigger();

create or replace function cleanup_reliability_data()
returns void language plpgsql security definer set search_path=public as $$
begin
 delete from telegram_updates_processed where processed_at < now()-interval '14 days';
 delete from system_events where created_at < now()-interval '45 days';
 delete from ai_usage_events where created_at < now()-interval '90 days';
end $$;
grant execute on function cleanup_reliability_data() to service_role;
