alter table public.subscription_lifecycle
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_used_at timestamptz;

update public.subscription_lifecycle
set trial_started_at = coalesce(trial_started_at,current_period_start,updated_at),
    trial_used_at = coalesce(trial_used_at,current_period_start,updated_at)
where state='trial';

create or replace function public.start_premium_trial_v1(_chat_id bigint)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_end timestamptz:=clock_timestamp()+interval '7 days';
  v_row public.subscription_lifecycle%rowtype;
  v_subscription_id bigint;
begin
  if _chat_id is null or _chat_id<=0 then
    raise exception using errcode='22023',message='invalid chat id';
  end if;
  if not exists(select 1 from public.profiles where telegram_id=_chat_id) then
    raise exception using errcode='P0002',message='profile not found';
  end if;

  perform pg_advisory_xact_lock(_chat_id);
  select * into v_row from public.subscription_lifecycle where chat_id=_chat_id for update;

  if found and v_row.plan='premium'
     and v_row.state in ('trial','active','grace')
     and (
       (v_row.state='trial' and coalesce(v_row.trial_ends_at,v_row.current_period_end)>v_now)
       or (v_row.state='active' and (v_row.current_period_end is null or v_row.current_period_end>v_now))
       or (v_row.state='grace' and coalesce(v_row.grace_ends_at,v_row.current_period_end)>v_now)
     ) then
    return jsonb_build_object('ok',true,'started',false,'reason','premium_already_active','plan',v_row.plan,'state',v_row.state,'ends_at',coalesce(v_row.trial_ends_at,v_row.grace_ends_at,v_row.current_period_end));
  end if;

  if found and v_row.trial_used_at is not null then
    return jsonb_build_object('ok',false,'started',false,'reason','trial_already_used','plan',coalesce(v_row.plan,'basic'),'state',coalesce(v_row.state,'active'));
  end if;

  insert into public.subscription_lifecycle(
    chat_id,plan,state,trial_ends_at,current_period_start,current_period_end,
    cancel_at_period_end,grace_ends_at,provider,provider_customer_id,
    provider_subscription_id,trial_started_at,trial_used_at,updated_at
  ) values (
    _chat_id,'premium','trial',v_end,v_now,v_end,false,null,'trial',null,null,v_now,v_now,v_now
  )
  on conflict(chat_id) do update set
    plan='premium',state='trial',trial_ends_at=v_end,current_period_start=v_now,
    current_period_end=v_end,cancel_at_period_end=false,grace_ends_at=null,
    provider='trial',provider_customer_id=null,provider_subscription_id=null,
    trial_started_at=coalesce(subscription_lifecycle.trial_started_at,v_now),
    trial_used_at=coalesce(subscription_lifecycle.trial_used_at,v_now),updated_at=v_now;

  insert into public.subscriptions(chat_id,plan,status,price_rub,provider,started_at,ends_at)
  values (_chat_id,'premium','active',0,'trial',v_now,v_end)
  returning id into v_subscription_id;

  return jsonb_build_object('ok',true,'started',true,'reason','trial_started','plan','premium','state','trial','ends_at',v_end,'subscription_id',v_subscription_id);
end;
$$;

create or replace function public.subscription_access_v1(_chat_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  r public.subscription_lifecycle%rowtype;
  v_now timestamptz:=now();
  v_period_start timestamptz;
  v_premium boolean:=false;
  v_state text:='active';
  v_plan text:='basic';
  v_photo_used bigint:=0;
  v_ai_used bigint:=0;
  v_photo_limit integer:=10;
  v_ai_limit integer:=20;
  v_trial_available boolean:=true;
begin
  v_period_start := (date_trunc('month',timezone('Europe/Moscow',v_now)) at time zone 'Europe/Moscow');
  select * into r from public.subscription_lifecycle where chat_id=_chat_id;

  if found then
    v_trial_available:=r.trial_used_at is null;
    v_premium:=r.plan='premium' and (
      (r.state='trial' and coalesce(r.trial_ends_at,r.current_period_end)>v_now)
      or (r.state='active' and (r.current_period_end is null or r.current_period_end>v_now))
      or (r.state='grace' and coalesce(r.grace_ends_at,r.current_period_end)>v_now)
    );
    if v_premium then v_plan:='premium';v_state:=r.state; end if;
  end if;

  select count(*) into v_photo_used from public.recognition_events
  where chat_id=_chat_id and created_at>=v_period_start;

  select count(*) into v_ai_used from public.ai_usage_events
  where chat_id=_chat_id and created_at>=v_period_start
    and lower(coalesce(request_type,feature,'')) in (
      'ai','ai_request','llm','completion','openai','text','recommend','why','shop','restaurant','quick','training','sweet','overate'
    );

  return jsonb_build_object(
    'chat_id',_chat_id,'plan',v_plan,'state',v_state,'premium',v_premium,
    'trial_available',v_trial_available and not v_premium,
    'trial_used_at',case when found then r.trial_used_at else null end,
    'trial_ends_at',case when v_premium and r.state='trial' then coalesce(r.trial_ends_at,r.current_period_end) else null end,
    'current_period_end',case when found then r.current_period_end else null end,
    'provider',case when found then r.provider else 'system_default' end,
    'period_start',v_period_start,
    'limits',jsonb_build_object('photo_analysis',case when v_premium then null else v_photo_limit end,'ai_request',case when v_premium then null else v_ai_limit end),
    'usage',jsonb_build_object('photo_analysis',v_photo_used,'ai_request',v_ai_used),
    'remaining',jsonb_build_object('photo_analysis',case when v_premium then null else greatest(v_photo_limit-v_photo_used::integer,0) end,'ai_request',case when v_premium then null else greatest(v_ai_limit-v_ai_used::integer,0) end),
    'can_photo_analysis',v_premium or v_photo_used<v_photo_limit,
    'can_ai_request',v_premium or v_ai_used<v_ai_limit
  );
end;
$$;

create or replace function public.subscription_entitlement(_chat_id bigint,_feature text)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare a jsonb;f text:=lower(coalesce(_feature,''));
begin
  a:=public.subscription_access_v1(_chat_id);
  if f in ('photo','photo_analysis','vision','vision_request') then return coalesce((a->>'can_photo_analysis')::boolean,false); end if;
  if f in ('ai','ai_request','recommend','why','shop','restaurant','quick','training','sweet','overate') then return coalesce((a->>'can_ai_request')::boolean,false); end if;
  if f in ('tracking','today','history','profile','basic_progress','weight','support','timeline','nutrition') then return true; end if;
  return coalesce((a->>'premium')::boolean,false);
end;
$$;

create or replace function public.refresh_subscription_states()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare n integer:=0;x integer;
begin
  update public.subscriptions set status='expired',updated_at=now()
  where status='active' and ends_at is not null and ends_at<now();
  get diagnostics x=row_count;n:=n+x;

  update public.subscription_lifecycle
  set plan='basic',state='active',trial_ends_at=null,current_period_start=now(),current_period_end=null,
      cancel_at_period_end=false,grace_ends_at=null,provider='system_default',provider_customer_id=null,
      provider_subscription_id=null,updated_at=now()
  where state='trial' and coalesce(trial_ends_at,current_period_end)<now();
  get diagnostics x=row_count;n:=n+x;

  update public.subscription_lifecycle
  set state='grace',grace_ends_at=coalesce(grace_ends_at,now()+interval '3 days'),updated_at=now()
  where plan='premium' and state='active' and current_period_end is not null
    and current_period_end<now() and cancel_at_period_end=false;
  get diagnostics x=row_count;n:=n+x;

  update public.subscription_lifecycle
  set plan='basic',state='active',trial_ends_at=null,current_period_start=now(),current_period_end=null,
      cancel_at_period_end=false,grace_ends_at=null,provider='system_default',provider_customer_id=null,
      provider_subscription_id=null,updated_at=now()
  where (state='grace' and grace_ends_at is not null and grace_ends_at<now())
     or (state='active' and cancel_at_period_end=true and current_period_end is not null and current_period_end<now())
     or state in ('cancelled','expired');
  get diagnostics x=row_count;n:=n+x;
  return n;
end;
$$;

revoke all on function public.start_premium_trial_v1(bigint) from public,anon,authenticated;
revoke all on function public.subscription_access_v1(bigint) from public,anon,authenticated;
revoke all on function public.subscription_entitlement(bigint,text) from public,anon,authenticated;
revoke all on function public.refresh_subscription_states() from public,anon,authenticated;
grant execute on function public.start_premium_trial_v1(bigint) to service_role;
grant execute on function public.subscription_access_v1(bigint) to service_role;
grant execute on function public.subscription_entitlement(bigint,text) to service_role;
grant execute on function public.refresh_subscription_states() to service_role;
