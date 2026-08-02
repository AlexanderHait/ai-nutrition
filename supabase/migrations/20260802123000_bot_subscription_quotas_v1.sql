create table if not exists public.subscription_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  source_event_id text not null,
  chat_id bigint not null,
  feature text not null check (feature in ('photo_analysis','ai_request')),
  status text not null default 'reserved' check (status in ('reserved','committed','released','expired')),
  reserved_at timestamptz not null default now(),
  finalized_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (source_event_id, feature)
);

alter table public.subscription_usage_reservations enable row level security;
revoke all on table public.subscription_usage_reservations from public, anon, authenticated;

create index if not exists subscription_usage_reservations_quota_idx
  on public.subscription_usage_reservations (chat_id, feature, reserved_at desc)
  where status in ('reserved','committed');

create index if not exists subscription_usage_reservations_status_idx
  on public.subscription_usage_reservations (status, reserved_at)
  where status='reserved';

create or replace function public.subscription_access_v1(_chat_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  r public.subscription_lifecycle%rowtype;
  v_has_lifecycle boolean:=false;
  v_now timestamptz:=now();
  v_period_start timestamptz;
  v_premium boolean:=false;
  v_state text:='active';
  v_plan text:='basic';
  v_photo_legacy bigint:=0;
  v_ai_legacy bigint:=0;
  v_photo_quota bigint:=0;
  v_ai_quota bigint:=0;
  v_photo_pending bigint:=0;
  v_ai_pending bigint:=0;
  v_photo_used bigint:=0;
  v_ai_used bigint:=0;
  v_photo_limit integer:=10;
  v_ai_limit integer:=20;
  v_trial_available boolean:=true;
begin
  v_period_start := (date_trunc('month',timezone('Europe/Moscow',v_now)) at time zone 'Europe/Moscow');
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
    end if;
  end if;

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
    'limits',jsonb_build_object(
      'photo_analysis',case when v_premium then null else v_photo_limit end,
      'ai_request',case when v_premium then null else v_ai_limit end
    ),
    'usage',jsonb_build_object('photo_analysis',v_photo_used,'ai_request',v_ai_used),
    'pending',jsonb_build_object('photo_analysis',v_photo_pending,'ai_request',v_ai_pending),
    'remaining',jsonb_build_object(
      'photo_analysis',case when v_premium then null else greatest(v_photo_limit-v_photo_used::integer,0) end,
      'ai_request',case when v_premium then null else greatest(v_ai_limit-v_ai_used::integer,0) end
    ),
    'can_photo_analysis',v_premium or v_photo_used<v_photo_limit,
    'can_ai_request',v_premium or v_ai_used<v_ai_limit,
    'usage_mode','hybrid_quota_v1'
  );
end;
$$;

create or replace function public.subscription_quota_reserve_v1(
  _chat_id bigint,
  _feature text,
  _source_event_id text,
  _metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_feature text;
  v_existing public.subscription_usage_reservations%rowtype;
  v_access jsonb;
  v_allowed boolean:=false;
begin
  if _chat_id is null or _chat_id<=0 then
    raise exception using errcode='22023',message='invalid chat id';
  end if;
  if nullif(trim(coalesce(_source_event_id,'')),'') is null then
    raise exception using errcode='22023',message='source_event_id is required';
  end if;
  if not exists(select 1 from public.profiles p where p.telegram_id=_chat_id) then
    raise exception using errcode='P0002',message='profile not found';
  end if;

  v_feature:=case lower(trim(coalesce(_feature,'')))
    when 'photo' then 'photo_analysis'
    when 'vision' then 'photo_analysis'
    when 'vision_request' then 'photo_analysis'
    when 'photo_analysis' then 'photo_analysis'
    when 'ai' then 'ai_request'
    when 'llm' then 'ai_request'
    when 'recommend' then 'ai_request'
    when 'why' then 'ai_request'
    when 'shop' then 'ai_request'
    when 'restaurant' then 'ai_request'
    when 'quick' then 'ai_request'
    when 'training' then 'ai_request'
    when 'sweet' then 'ai_request'
    when 'overate' then 'ai_request'
    when 'ai_request' then 'ai_request'
    else null
  end;
  if v_feature is null then
    raise exception using errcode='22023',message='unsupported feature';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('subscription-quota:'||_chat_id::text||':'||v_feature,0));

  update public.subscription_usage_reservations
     set status='expired',finalized_at=v_now
   where chat_id=_chat_id and feature=v_feature and status='reserved'
     and reserved_at<v_now-interval '15 minutes';

  select * into v_existing
  from public.subscription_usage_reservations
  where source_event_id=trim(_source_event_id) and feature=v_feature
  for update;

  if found and v_existing.status in ('reserved','committed') then
    v_access:=public.subscription_access_v1(_chat_id);
    return jsonb_build_object(
      'ok',true,'allowed',true,'duplicate',true,'reason','already_reserved',
      'reservation_id',v_existing.id,'reservation_status',v_existing.status,
      'feature',v_feature,'access',v_access
    );
  end if;

  v_access:=public.subscription_access_v1(_chat_id);
  v_allowed:=case when v_feature='photo_analysis'
    then coalesce((v_access->>'can_photo_analysis')::boolean,false)
    else coalesce((v_access->>'can_ai_request')::boolean,false)
  end;

  if not v_allowed then
    return jsonb_build_object(
      'ok',true,'allowed',false,'duplicate',false,'reason','limit_reached',
      'feature',v_feature,'access',v_access
    );
  end if;

  if found then
    update public.subscription_usage_reservations
       set chat_id=_chat_id,status='reserved',reserved_at=v_now,finalized_at=null,
           metadata=coalesce(_metadata,'{}'::jsonb)
     where id=v_existing.id
     returning * into v_existing;
  else
    insert into public.subscription_usage_reservations(
      source_event_id,chat_id,feature,status,reserved_at,metadata
    ) values (
      trim(_source_event_id),_chat_id,v_feature,'reserved',v_now,coalesce(_metadata,'{}'::jsonb)
    )
    returning * into v_existing;
  end if;

  v_access:=public.subscription_access_v1(_chat_id);
  return jsonb_build_object(
    'ok',true,'allowed',true,'duplicate',false,'reason','reserved',
    'reservation_id',v_existing.id,'reservation_status',v_existing.status,
    'feature',v_feature,'access',v_access
  );
end;
$$;

create or replace function public.subscription_quota_finalize_v1(
  _source_event_id text,
  _feature text,
  _result text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_feature text;
  v_target text;
  v_row public.subscription_usage_reservations%rowtype;
begin
  if nullif(trim(coalesce(_source_event_id,'')),'') is null then
    raise exception using errcode='22023',message='source_event_id is required';
  end if;

  v_feature:=case lower(trim(coalesce(_feature,'')))
    when 'photo' then 'photo_analysis'
    when 'vision' then 'photo_analysis'
    when 'vision_request' then 'photo_analysis'
    when 'photo_analysis' then 'photo_analysis'
    when 'ai' then 'ai_request'
    when 'llm' then 'ai_request'
    when 'recommend' then 'ai_request'
    when 'why' then 'ai_request'
    when 'shop' then 'ai_request'
    when 'restaurant' then 'ai_request'
    when 'quick' then 'ai_request'
    when 'training' then 'ai_request'
    when 'sweet' then 'ai_request'
    when 'overate' then 'ai_request'
    when 'ai_request' then 'ai_request'
    else null
  end;
  if v_feature is null then
    raise exception using errcode='22023',message='unsupported feature';
  end if;

  v_target:=case lower(trim(coalesce(_result,'')))
    when 'commit' then 'committed'
    when 'committed' then 'committed'
    when 'success' then 'committed'
    when 'release' then 'released'
    when 'released' then 'released'
    when 'failed' then 'released'
    when 'error' then 'released'
    else null
  end;
  if v_target is null then
    raise exception using errcode='22023',message='unsupported result';
  end if;

  select * into v_row
  from public.subscription_usage_reservations
  where source_event_id=trim(_source_event_id) and feature=v_feature
  for update;

  if not found then
    return jsonb_build_object('ok',false,'updated',false,'reason','reservation_not_found','feature',v_feature);
  end if;

  if v_row.status=v_target then
    return jsonb_build_object(
      'ok',true,'updated',false,'duplicate',true,'reason','already_finalized',
      'reservation_id',v_row.id,'reservation_status',v_row.status,'feature',v_feature,
      'access',public.subscription_access_v1(v_row.chat_id)
    );
  end if;

  if v_row.status<>'reserved' then
    return jsonb_build_object(
      'ok',false,'updated',false,'duplicate',false,'reason','invalid_reservation_state',
      'reservation_id',v_row.id,'reservation_status',v_row.status,'feature',v_feature,
      'access',public.subscription_access_v1(v_row.chat_id)
    );
  end if;

  update public.subscription_usage_reservations
     set status=v_target,finalized_at=clock_timestamp()
   where id=v_row.id
   returning * into v_row;

  return jsonb_build_object(
    'ok',true,'updated',true,'duplicate',false,'reason',v_target,
    'reservation_id',v_row.id,'reservation_status',v_row.status,'feature',v_feature,
    'access',public.subscription_access_v1(v_row.chat_id)
  );
end;
$$;

revoke all on function public.subscription_access_v1(bigint) from public,anon,authenticated;
revoke all on function public.subscription_quota_reserve_v1(bigint,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.subscription_quota_finalize_v1(text,text,text) from public,anon,authenticated;
grant execute on function public.subscription_access_v1(bigint) to service_role;
grant execute on function public.subscription_quota_reserve_v1(bigint,text,text,jsonb) to service_role;
grant execute on function public.subscription_quota_finalize_v1(text,text,text) to service_role;
