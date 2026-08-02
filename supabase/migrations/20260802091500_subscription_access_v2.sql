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
    if v_premium then v_plan:='premium';v_state:=r.state;end if;
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
    'trial_used_at',case when v_has_lifecycle then r.trial_used_at else null end,
    'trial_ends_at',case when v_premium and r.state='trial' then coalesce(r.trial_ends_at,r.current_period_end) else null end,
    'current_period_end',case when v_has_lifecycle then r.current_period_end else null end,
    'provider',case when v_has_lifecycle then coalesce(r.provider,'system_default') else 'system_default' end,
    'period_start',v_period_start,
    'limits',jsonb_build_object('photo_analysis',case when v_premium then null else v_photo_limit end,'ai_request',case when v_premium then null else v_ai_limit end),
    'usage',jsonb_build_object('photo_analysis',v_photo_used,'ai_request',v_ai_used),
    'remaining',jsonb_build_object('photo_analysis',case when v_premium then null else greatest(v_photo_limit-v_photo_used::integer,0) end,'ai_request',case when v_premium then null else greatest(v_ai_limit-v_ai_used::integer,0) end),
    'can_photo_analysis',v_premium or v_photo_used<v_photo_limit,
    'can_ai_request',v_premium or v_ai_used<v_ai_limit
  );
end;
$$;

revoke all on function public.subscription_access_v1(bigint) from public,anon,authenticated;
grant execute on function public.subscription_access_v1(bigint) to service_role;
