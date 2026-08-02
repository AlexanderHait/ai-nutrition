create or replace function public.coach_score_symmetric_v1(
  _actual numeric,
  _target numeric,
  _tolerance numeric,
  _penalty numeric
)
returns numeric
language sql
immutable
strict
as $$
  select greatest(0::numeric,least(100::numeric,
    100-greatest(0::numeric,abs(_actual/_target-1)-_tolerance)*_penalty
  ));
$$;

create or replace function public.coach_score_protein_v1(
  _actual numeric,
  _target numeric
)
returns numeric
language sql
immutable
strict
as $$
  select case
    when _actual/_target between .90 and 1.30 then 100
    when _actual/_target<.90 then greatest(0::numeric,100-(.90-_actual/_target)*125)
    else greatest(0::numeric,100-(_actual/_target-1.30)*50)
  end;
$$;

create or replace function public.coach_scores_v2(
  _chat_ids bigint[] default null,
  _days integer default 7
)
returns table(
  chat_id bigint,
  score integer,
  nutrition_quality integer,
  stability integer,
  recommendation_adherence integer,
  active_days integer,
  period_days integer,
  recommendation_samples integer,
  confidence integer,
  trend integer,
  target_count integer,
  data_status text,
  calculated_at timestamptz
)
language sql
stable
security definer
set search_path=public
as $$
with params as (
  select greatest(3,least(coalesce(_days,7),30))::integer as days,
         timezone('Europe/Moscow',now())::date as today
),
scope as (
  select p.telegram_id as chat_id,
    greatest(1,least(x.days,(x.today-timezone('Europe/Moscow',p.created_at)::date+1)::integer)) as eligible_days,
    cs.kcal_target,cs.protein_target,cs.fat_target,cs.carb_target,
    ((case when coalesce(cs.kcal_target,0)>0 then 1 else 0 end)
     +(case when coalesce(cs.protein_target,0)>0 then 1 else 0 end)
     +(case when coalesce(cs.fat_target,0)>0 then 1 else 0 end)
     +(case when coalesce(cs.carb_target,0)>0 then 1 else 0 end))::integer as target_count
  from public.profiles p
  cross join params x
  left join public.client_settings cs on cs.chat_id=p.telegram_id
  where _chat_ids is null or p.telegram_id=any(_chat_ids)
),
daily as (
  select m.chat_id,m.eaten_day,
    sum(m.kcal)::numeric as kcal,
    sum(m.prot)::numeric as protein,
    sum(m.fat)::numeric as fat,
    sum(m.carb)::numeric as carb
  from public.meals m
  cross join params x
  where m.deleted=false
    and m.eaten_day between x.today-(x.days*2-1) and x.today
    and (_chat_ids is null or m.chat_id=any(_chat_ids))
  group by m.chat_id,m.eaten_day
),
scored as (
  select d.chat_id,d.eaten_day,d.kcal,
    case when d.eaten_day>=x.today-(x.days-1) then 'current' else 'previous' end as window_name,
    case when s.target_count=0 then null else
      (
        coalesce(public.coach_score_symmetric_v1(d.kcal,s.kcal_target,.10,125)*.45,0)
        +coalesce(public.coach_score_protein_v1(d.protein,s.protein_target)*.35,0)
        +coalesce(public.coach_score_symmetric_v1(d.fat,s.fat_target,.20,100)*.10,0)
        +coalesce(public.coach_score_symmetric_v1(d.carb,s.carb_target,.20,100)*.10,0)
      )/
      (
        (case when coalesce(s.kcal_target,0)>0 then .45 else 0 end)
        +(case when coalesce(s.protein_target,0)>0 then .35 else 0 end)
        +(case when coalesce(s.fat_target,0)>0 then .10 else 0 end)
        +(case when coalesce(s.carb_target,0)>0 then .10 else 0 end)
      )
    end as quality_score
  from daily d
  join scope s on s.chat_id=d.chat_id
  cross join params x
),
stats as (
  select s.chat_id,s.eligible_days,s.target_count,
    count(d.eaten_day) filter(where d.window_name='current')::integer as current_days,
    count(d.eaten_day) filter(where d.window_name='previous')::integer as previous_days,
    round(avg(d.quality_score) filter(where d.window_name='current'))::integer as current_quality,
    round(avg(d.quality_score) filter(where d.window_name='previous'))::integer as previous_quality,
    avg(d.kcal) filter(where d.window_name='current') as current_kcal_avg,
    stddev_pop(d.kcal) filter(where d.window_name='current') as current_kcal_sd,
    avg(d.kcal) filter(where d.window_name='previous') as previous_kcal_avg,
    stddev_pop(d.kcal) filter(where d.window_name='previous') as previous_kcal_sd
  from scope s
  left join scored d on d.chat_id=s.chat_id
  group by s.chat_id,s.eligible_days,s.target_count
),
components as (
  select st.*,
    case when st.current_days=0 then null else round(greatest(0::numeric,least(100::numeric,
      (st.current_days::numeric/st.eligible_days*100)*.60
      +(case when st.current_days<2 or coalesce(st.current_kcal_avg,0)<=0 then 50
             else greatest(0::numeric,least(100::numeric,
               100-coalesce(st.current_kcal_sd,0)/nullif(st.current_kcal_avg,0)*100
             )) end)*.40
    )))::integer end as current_stability,
    case when st.previous_days=0 then null else round(greatest(0::numeric,least(100::numeric,
      (st.previous_days::numeric/(select days from params)*100)*.60
      +(case when st.previous_days<2 or coalesce(st.previous_kcal_avg,0)<=0 then 50
             else greatest(0::numeric,least(100::numeric,
               100-coalesce(st.previous_kcal_sd,0)/nullif(st.previous_kcal_avg,0)*100
             )) end)*.40
    )))::integer end as previous_stability
  from stats st
),
decisions as (
  select r.chat_id,
    case
      when lower(coalesce(r.outcome,'')) in ('followed','applied','completed','success','successful','accepted','done') then 100
      when lower(coalesce(r.outcome,'')) in ('ignored','failed','rejected','not_followed','not followed') then 0
      when lower(coalesce(r.feedback,''))='useful' then 100
      when lower(coalesce(r.feedback,''))='not_fit' then 0
      else null
    end::numeric as value
  from public.premium_recommendations r
  where r.created_at>=now()-interval '30 days'
    and (_chat_ids is null or r.chat_id=any(_chat_ids))
  union all
  select p.chat_id,
    case when p.status='applied' then 100 when p.status='dismissed' then 0 else null end::numeric
  from public.premium_target_proposals p
  where p.created_at>=now()-interval '30 days'
    and (_chat_ids is null or p.chat_id=any(_chat_ids))
),
recommendations as (
  select s.chat_id,
    count(d.value) filter(where d.value is not null)::integer as samples,
    case when count(d.value) filter(where d.value is not null)=0 then null else round(
      (coalesce(sum(d.value) filter(where d.value is not null),0)+100)
      /(count(d.value) filter(where d.value is not null)+2)
    )::integer end as rec_score
  from scope s
  left join decisions d on d.chat_id=s.chat_id
  group by s.chat_id
),
assembled as (
  select c.*,r.samples,r.rec_score,
    case when c.current_quality is null then null else round(
      (c.current_quality*50+c.current_stability*30
       +coalesce(r.rec_score,0)*(case when r.rec_score is not null then 20 else 0 end))::numeric
      /(80+(case when r.rec_score is not null then 20 else 0 end))
    )::integer end as overall,
    case when c.current_quality is null then null
         else round((c.current_quality*50+c.current_stability*30)::numeric/80)::integer end as current_core,
    case when c.previous_quality is null then null
         else round((c.previous_quality*50+c.previous_stability*30)::numeric/80)::integer end as previous_core
  from components c
  join recommendations r on r.chat_id=c.chat_id
)
select a.chat_id,a.overall,a.current_quality,a.current_stability,a.rec_score,
  a.current_days,a.eligible_days,a.samples,
  case when a.current_days=0 then null else round(least(100::numeric,
    (a.current_days::numeric/a.eligible_days*100)*.60
    +(a.target_count::numeric/4*100)*.25
    +(least(a.samples,3)::numeric/3*100)*.15
  ))::integer end as confidence,
  case when a.current_days>=3 and a.previous_days>=3
       and a.current_core is not null and a.previous_core is not null
       then a.current_core-a.previous_core else null end::integer as trend,
  a.target_count,
  case when a.current_days=0 then 'no_data'
       when a.target_count=0 then 'setup_required'
       when a.current_days<3 then 'preliminary'
       when a.current_days<5 then 'growing'
       else 'reliable' end as data_status,
  now() as calculated_at
from assembled a
order by a.overall desc nulls last,a.chat_id;
$$;

create or replace function public.coach_score_v2(
  _chat_id bigint,
  _days integer default 7
)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select to_jsonb(x)
  from public.coach_scores_v2(array[_chat_id],_days) x
  limit 1;
$$;

revoke all on function public.coach_score_symmetric_v1(numeric,numeric,numeric,numeric) from public,anon,authenticated;
revoke all on function public.coach_score_protein_v1(numeric,numeric) from public,anon,authenticated;
revoke all on function public.coach_scores_v2(bigint[],integer) from public,anon,authenticated;
revoke all on function public.coach_score_v2(bigint,integer) from public,anon,authenticated;
grant execute on function public.coach_score_symmetric_v1(numeric,numeric,numeric,numeric) to service_role;
grant execute on function public.coach_score_protein_v1(numeric,numeric) to service_role;
grant execute on function public.coach_scores_v2(bigint[],integer) to service_role;
grant execute on function public.coach_score_v2(bigint,integer) to service_role;
