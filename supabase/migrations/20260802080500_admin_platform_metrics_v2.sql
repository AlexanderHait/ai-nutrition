create or replace function public.admin_platform_metrics_v2(
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
with base as (
  select public.admin_platform_metrics_v1(_days,_recognition_days,_client_limit) as data
),
rec_rows as (
  select
    chat_id,
    round((confidence_food*0.45+confidence_portion*0.30+confidence_nutrition*0.25)*100)::integer as score
  from public.recognition_events
  where created_at >= now()-make_interval(days=>greatest(1,least(coalesce(_recognition_days,7),30)))
),
rec_summary as (
  select
    count(*) filter(where score>0)::bigint as confidence_samples,
    count(*) filter(where score=0)::bigint as zero_confidence,
    round(avg(score) filter(where score>0))::integer as avg_confidence
  from rec_rows
),
client_confidence as (
  select
    chat_id,
    count(*) filter(where score>0)::bigint as confidence_samples,
    count(*) filter(where score=0)::bigint as zero_confidence,
    round(avg(score) filter(where score>0))::integer as avg_confidence
  from rec_rows
  where chat_id is not null
  group by chat_id
),
patched_clients as (
  select coalesce(jsonb_agg(
    e.item || jsonb_build_object(
      'avg_confidence',coalesce(c.avg_confidence,0),
      'confidence_samples',coalesce(c.confidence_samples,0),
      'zero_confidence',coalesce(c.zero_confidence,0)
    ) order by e.ord
  ),'[]'::jsonb) as value
  from base b
  cross join lateral jsonb_array_elements(b.data->'clients') with ordinality as e(item,ord)
  left join client_confidence c on c.chat_id=(e.item->>'chat_id')::bigint
)
select jsonb_set(
  jsonb_set(
    b.data,
    '{recognition}',
    (b.data->'recognition') || to_jsonb(r),
    true
  ),
  '{clients}',
  p.value,
  true
)
from base b
cross join rec_summary r
cross join patched_clients p;
$$;

revoke all on function public.admin_platform_metrics_v2(integer,integer,integer) from public, anon, authenticated;
grant execute on function public.admin_platform_metrics_v2(integer,integer,integer) to service_role;
