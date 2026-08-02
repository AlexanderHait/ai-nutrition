create or replace function public.admin_platform_metrics_v1(
  _days integer default 30,
  _recognition_days integer default 7,
  _client_limit integer default 80
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with p as (
  select
    now() - make_interval(days => greatest(1, least(coalesce(_days, 30), 90))) as from_at,
    now() - make_interval(days => greatest(1, least(coalesce(_recognition_days, 7), 30))) as recognition_from_at,
    greatest(1, least(coalesce(_client_limit, 80), 200)) as client_limit
),
usage_base as (
  select
    u.*,
    case lower(coalesce(nullif(u.request_type,''), nullif(u.feature,''), 'execution'))
      when 'ai' then 'ai_request'
      when 'llm' then 'ai_request'
      when 'openai' then 'ai_request'
      when 'completion' then 'ai_request'
      when 'vision' then 'vision_request'
      when 'image' then 'vision_request'
      when 'photo' then 'vision_request'
      when 'search' then 'web_search'
      when 'internet' then 'web_search'
      when 'web' then 'web_search'
      when 'n8n' then 'execution'
      else lower(coalesce(nullif(u.request_type,''), nullif(u.feature,''), 'execution'))
    end as kind,
    coalesce(u.input_tokens, u.estimated_input_tokens, 0)
      + coalesce(u.output_tokens, u.estimated_output_tokens, 0) as total_tokens
  from public.ai_usage_events u, p
  where u.created_at >= p.from_at
),
usage_summary as (
  select
    count(*)::bigint as events,
    count(*) filter (where kind='execution')::bigint as executions,
    count(*) filter (where kind='ai_request')::bigint as ai_requests,
    count(*) filter (where kind='vision_request')::bigint as vision_requests,
    count(*) filter (where kind='web_search')::bigint as web_searches,
    count(*) filter (where success=false)::bigint as failures,
    coalesce(sum(total_tokens),0)::bigint as tokens,
    coalesce(sum(cost_usd),0)::numeric as cost_usd,
    max(created_at) as last_event_at,
    count(*) filter (where workflow is not null)::bigint as with_workflow,
    count(*) filter (where model is not null)::bigint as with_model,
    count(*) filter (where total_tokens>0)::bigint as with_tokens,
    count(*) filter (where cost_usd is not null and cost_usd>0)::bigint as with_cost,
    count(*) filter (where source_event_id is not null)::bigint as with_source_event_id
  from usage_base
),
usage_latency as (
  select
    count(*) filter (where latency_ms is not null and latency_ms>0)::bigint as samples,
    round(avg(latency_ms) filter (where latency_ms is not null and latency_ms>0))::bigint as avg_ms,
    round(percentile_cont(0.50) within group (order by latency_ms) filter (where latency_ms is not null and latency_ms>0))::bigint as p50_ms,
    round(percentile_cont(0.95) within group (order by latency_ms) filter (where latency_ms is not null and latency_ms>0))::bigint as p95_ms,
    round(percentile_cont(0.99) within group (order by latency_ms) filter (where latency_ms is not null and latency_ms>0))::bigint as p99_ms
  from usage_base
),
usage_by_model as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.events desc, x.model), '[]'::jsonb) as value
  from (
    select
      coalesce(model,'Без модели') as model,
      coalesce(provider,'—') as provider,
      count(*)::bigint as events,
      count(*) filter (where success=false)::bigint as failures,
      coalesce(sum(total_tokens),0)::bigint as tokens,
      coalesce(sum(cost_usd),0)::numeric as cost_usd,
      round(avg(latency_ms) filter (where latency_ms>0))::bigint as avg_ms,
      round(percentile_cont(0.95) within group (order by latency_ms) filter (where latency_ms>0))::bigint as p95_ms,
      max(created_at) as last_event_at
    from usage_base
    group by coalesce(model,'Без модели'), coalesce(provider,'—')
    order by count(*) desc
    limit 30
  ) x
),
usage_by_workflow as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.events desc, x.workflow), '[]'::jsonb) as value
  from (
    select
      coalesce(workflow,'Без workflow') as workflow,
      count(*)::bigint as events,
      count(*) filter (where success=false)::bigint as failures,
      coalesce(sum(total_tokens),0)::bigint as tokens,
      coalesce(sum(cost_usd),0)::numeric as cost_usd,
      round(avg(latency_ms) filter (where latency_ms>0))::bigint as avg_ms,
      round(percentile_cont(0.95) within group (order by latency_ms) filter (where latency_ms>0))::bigint as p95_ms,
      max(created_at) as last_event_at
    from usage_base
    group by coalesce(workflow,'Без workflow')
    order by count(*) desc
    limit 50
  ) x
),
usage_daily as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.day), '[]'::jsonb) as value
  from (
    select
      created_at::date as day,
      count(*)::bigint as events,
      count(*) filter (where success=false)::bigint as failures,
      coalesce(sum(total_tokens),0)::bigint as tokens,
      coalesce(sum(cost_usd),0)::numeric as cost_usd
    from usage_base
    group by created_at::date
  ) x
),
bot_base as (
  select b.*
  from public.bot_events b, p
  where b.created_at >= p.from_at
),
bot_summary as (
  select
    count(*)::bigint as events,
    count(*) filter (where event_type='photo_analyzed')::bigint as photos,
    count(*) filter (where event_type='meal_saved')::bigint as saved,
    count(*) filter (where event_type='meal_edited')::bigint as edited,
    count(*) filter (where event_type='photo_recognition_cache')::bigint as cache_hits
  from bot_base
),
rec_base as (
  select
    r.*,
    round((coalesce(r.confidence_food,0)*0.45 + coalesce(r.confidence_portion,0)*0.30 + coalesce(r.confidence_nutrition,0)*0.25)*100)::integer as confidence_score
  from public.recognition_events r, p
  where r.created_at >= p.recognition_from_at
),
rec_summary as (
  select
    count(*)::bigint as recognitions,
    count(*) filter (where needs_confirmation=true)::bigint as review_required,
    round(avg(confidence_score))::integer as avg_confidence,
    round(avg(latency_ms) filter (where latency_ms>0))::bigint as avg_ms,
    round(percentile_cont(0.50) within group (order by latency_ms) filter (where latency_ms>0))::bigint as p50_ms,
    round(percentile_cont(0.95) within group (order by latency_ms) filter (where latency_ms>0))::bigint as p95_ms,
    round(percentile_cont(0.99) within group (order by latency_ms) filter (where latency_ms>0))::bigint as p99_ms
  from rec_base
),
usage_client as (
  select
    chat_id,
    count(*) filter (where kind='ai_request')::bigint as ai,
    count(*) filter (where kind='vision_request')::bigint as vision,
    count(*) filter (where kind='web_search')::bigint as web,
    count(*) filter (where success=false)::bigint as failures,
    coalesce(sum(total_tokens),0)::bigint as tokens,
    coalesce(sum(cost_usd),0)::numeric as cost_usd,
    round(avg(latency_ms) filter (where latency_ms>0))::bigint as avg_ms,
    round(percentile_cont(0.95) within group (order by latency_ms) filter (where latency_ms>0))::bigint as p95_ms,
    max(created_at) as last_event_at
  from usage_base
  where chat_id is not null
  group by chat_id
),
bot_client as (
  select
    chat_id,
    count(*)::bigint as events,
    count(*) filter (where event_type='photo_analyzed')::bigint as photos,
    count(*) filter (where event_type='meal_saved')::bigint as saved,
    count(*) filter (where event_type='meal_edited')::bigint as edited,
    count(*) filter (where event_type='photo_recognition_cache')::bigint as cache_hits
  from bot_base
  where chat_id is not null
  group by chat_id
),
rec_client as (
  select
    chat_id,
    count(*)::bigint as recognitions,
    count(*) filter (where needs_confirmation=true)::bigint as review_required,
    round(avg(confidence_score))::integer as avg_confidence,
    round(avg(latency_ms) filter (where latency_ms>0))::bigint as avg_ms
  from rec_base
  where chat_id is not null
  group by chat_id
),
client_ids as (
  select chat_id from usage_client
  union
  select chat_id from bot_client
  union
  select chat_id from rec_client
),
clients as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.activity desc, x.chat_id), '[]'::jsonb) as value
  from (
    select
      c.chat_id,
      coalesce(b.events,0)::bigint as bot_events,
      coalesce(b.photos,0)::bigint as photos,
      coalesce(b.saved,0)::bigint as saved,
      coalesce(b.edited,0)::bigint as edited,
      coalesce(b.cache_hits,0)::bigint as cache_hits,
      coalesce(r.recognitions,0)::bigint as recognitions,
      coalesce(r.review_required,0)::bigint as review_required,
      coalesce(r.avg_confidence,0)::integer as avg_confidence,
      coalesce(r.avg_ms,0)::bigint as recognition_avg_ms,
      coalesce(u.ai,0)::bigint as ai,
      coalesce(u.vision,0)::bigint as vision,
      coalesce(u.web,0)::bigint as web,
      coalesce(u.failures,0)::bigint as failures,
      coalesce(u.tokens,0)::bigint as tokens,
      coalesce(u.cost_usd,0)::numeric as cost_usd,
      coalesce(u.avg_ms,0)::bigint as ai_avg_ms,
      coalesce(u.p95_ms,0)::bigint as ai_p95_ms,
      u.last_event_at,
      (coalesce(b.events,0)+coalesce(r.recognitions,0)+coalesce(u.ai,0)+coalesce(u.vision,0)+coalesce(u.web,0))::bigint as activity
    from client_ids c
    left join bot_client b using(chat_id)
    left join rec_client r using(chat_id)
    left join usage_client u using(chat_id)
    order by activity desc, c.chat_id
    limit (select client_limit from p)
  ) x
)
select jsonb_build_object(
  'generated_at', now(),
  'period_days', greatest(1, least(coalesce(_days,30),90)),
  'recognition_period_days', greatest(1, least(coalesce(_recognition_days,7),30)),
  'ai', jsonb_build_object(
    'summary', to_jsonb(us),
    'latency', to_jsonb(ul),
    'models', um.value,
    'workflows', uw.value,
    'daily', ud.value
  ),
  'bot', to_jsonb(bs),
  'recognition', to_jsonb(rs),
  'clients', c.value
)
from usage_summary us
cross join usage_latency ul
cross join usage_by_model um
cross join usage_by_workflow uw
cross join usage_daily ud
cross join bot_summary bs
cross join rec_summary rs
cross join clients c;
$$;

revoke all on function public.admin_platform_metrics_v1(integer,integer,integer) from public, anon, authenticated;
grant execute on function public.admin_platform_metrics_v1(integer,integer,integer) to service_role;
