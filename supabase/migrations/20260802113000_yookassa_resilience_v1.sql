create or replace function public.prepare_yookassa_order_v1(
  _chat_id bigint,
  _plan text,
  _amount_rub integer,
  _receipt_email text default null,
  _metadata jsonb default '{}'::jsonb
)
returns table(
  id uuid,
  chat_id bigint,
  plan text,
  amount_rub integer,
  currency text,
  provider text,
  provider_payment_id text,
  idempotency_key uuid,
  status text,
  confirmation_url text,
  receipt_email text,
  metadata jsonb,
  created_at timestamptz,
  reused boolean
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_order public.payment_orders%rowtype;
  v_price integer;
begin
  if _chat_id is null or _chat_id<=0 then
    raise exception using errcode='22023',message='invalid chat id';
  end if;
  if _plan not in ('basic','premium') then
    raise exception using errcode='22023',message='invalid plan';
  end if;
  if not exists(select 1 from public.profiles where telegram_id=_chat_id) then
    raise exception using errcode='P0002',message='profile not found';
  end if;

  select price_rub into v_price
  from public.subscription_products
  where plan=_plan and enabled=true;
  if v_price is null or v_price<>_amount_rub then
    raise exception using errcode='22023',message='subscription price mismatch';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('yookassa-order:'||_chat_id::text||':'||_plan,0));

  select * into v_order
  from public.payment_orders o
  where o.chat_id=_chat_id
    and o.plan=_plan
    and o.provider='yookassa'
    and o.status='pending'
    and o.amount_rub=_amount_rub
    and o.created_at>=v_now-interval '30 minutes'
  order by o.created_at desc
  limit 1
  for update;

  if found then
    update public.payment_orders o
       set receipt_email=coalesce(nullif(trim(coalesce(_receipt_email,'')),''),o.receipt_email),
           metadata=o.metadata||coalesce(_metadata,'{}'::jsonb),
           updated_at=v_now
     where o.id=v_order.id
     returning o.* into v_order;

    return query select
      v_order.id,v_order.chat_id,v_order.plan,v_order.amount_rub,v_order.currency,
      v_order.provider,v_order.provider_payment_id,v_order.idempotency_key,v_order.status,
      v_order.confirmation_url,v_order.receipt_email,v_order.metadata,v_order.created_at,true;
    return;
  end if;

  insert into public.payment_orders(
    chat_id,plan,amount_rub,currency,provider,idempotency_key,status,
    receipt_email,metadata,created_at,updated_at
  ) values (
    _chat_id,_plan,_amount_rub,'RUB','yookassa',gen_random_uuid(),'pending',
    nullif(trim(coalesce(_receipt_email,'')),''),coalesce(_metadata,'{}'::jsonb),v_now,v_now
  ) returning * into v_order;

  return query select
    v_order.id,v_order.chat_id,v_order.plan,v_order.amount_rub,v_order.currency,
    v_order.provider,v_order.provider_payment_id,v_order.idempotency_key,v_order.status,
    v_order.confirmation_url,v_order.receipt_email,v_order.metadata,v_order.created_at,false;
end;
$$;

create or replace function public.process_yookassa_payment(
  _payment_id text,
  _status text,
  _payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_order public.payment_orders%rowtype;
  v_lifecycle public.subscription_lifecycle%rowtype;
  v_period_days integer;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_existing_end timestamptz;
  v_event_type text;
begin
  if nullif(trim(_payment_id),'') is null then
    raise exception using errcode='22023',message='payment id is required';
  end if;

  _status:=lower(coalesce(_status,''));
  if _status not in ('pending','succeeded','canceled','failed') then
    raise exception using errcode='22023',message='unsupported payment status';
  end if;

  select * into v_order
  from public.payment_orders
  where provider='yookassa' and provider_payment_id=_payment_id
  for update;
  if not found then
    raise exception using errcode='P0002',message='payment order not found';
  end if;

  v_event_type:=case _status
    when 'succeeded' then 'payment.succeeded'
    when 'canceled' then 'payment.canceled'
    when 'failed' then 'payment.failed'
    else 'payment.pending'
  end;

  insert into public.payment_events(
    order_id,chat_id,provider,event_type,external_id,
    amount_rub,plan,status,payload,created_at,updated_at
  ) values (
    v_order.id,v_order.chat_id,'yookassa',v_event_type,_payment_id,
    v_order.amount_rub,v_order.plan,_status,coalesce(_payload,'{}'::jsonb),v_now,v_now
  ) on conflict do nothing;

  if _status='succeeded' then
    if v_order.status='succeeded' then
      return jsonb_build_object('ok',true,'duplicate',true,'order_id',v_order.id,'chat_id',v_order.chat_id,'plan',v_order.plan);
    end if;

    select period_days into v_period_days
    from public.subscription_products
    where plan=v_order.plan and enabled=true;
    if v_period_days is null then
      raise exception using errcode='P0002',message='subscription product not found';
    end if;

    perform pg_advisory_xact_lock(v_order.chat_id);
    select * into v_lifecycle
    from public.subscription_lifecycle
    where chat_id=v_order.chat_id
    for update;

    if found and v_lifecycle.plan=v_order.plan and v_lifecycle.state='active'
       and v_lifecycle.current_period_end is null then
      v_period_start:=coalesce(v_lifecycle.current_period_start,v_now);
      v_period_end:=null;
    elsif found and v_lifecycle.plan=v_order.plan
       and v_lifecycle.state in ('trial','active','grace') then
      v_existing_end:=greatest(
        coalesce(v_lifecycle.current_period_end,'-infinity'::timestamptz),
        coalesce(v_lifecycle.trial_ends_at,'-infinity'::timestamptz),
        coalesce(v_lifecycle.grace_ends_at,'-infinity'::timestamptz)
      );
      if v_existing_end>v_now then
        v_period_start:=coalesce(v_lifecycle.current_period_start,v_now);
        v_period_end:=v_existing_end+make_interval(days=>v_period_days);
      else
        v_period_start:=v_now;
        v_period_end:=v_now+make_interval(days=>v_period_days);
      end if;
    else
      v_period_start:=v_now;
      v_period_end:=v_now+make_interval(days=>v_period_days);
    end if;

    update public.payment_orders
       set status='succeeded',paid_at=coalesce(paid_at,v_now),updated_at=v_now,
           metadata=metadata||jsonb_build_object('provider_payload',coalesce(_payload,'{}'::jsonb))
     where id=v_order.id;

    insert into public.subscription_lifecycle(
      chat_id,plan,state,trial_ends_at,current_period_start,current_period_end,
      cancel_at_period_end,grace_ends_at,provider,provider_customer_id,
      provider_subscription_id,trial_started_at,trial_used_at,updated_at
    ) values (
      v_order.chat_id,v_order.plan,'active',null,v_period_start,v_period_end,
      v_period_end is not null,null,'yookassa',null,_payment_id,
      null,case when v_order.plan='premium' then v_now else null end,v_now
    )
    on conflict(chat_id) do update set
      plan=excluded.plan,
      state=excluded.state,
      trial_ends_at=null,
      current_period_start=excluded.current_period_start,
      current_period_end=excluded.current_period_end,
      cancel_at_period_end=excluded.cancel_at_period_end,
      grace_ends_at=null,
      provider='yookassa',
      provider_customer_id=null,
      provider_subscription_id=_payment_id,
      trial_started_at=subscription_lifecycle.trial_started_at,
      trial_used_at=case when v_order.plan='premium'
        then coalesce(subscription_lifecycle.trial_used_at,v_now)
        else subscription_lifecycle.trial_used_at end,
      updated_at=v_now;

    insert into public.subscriptions(
      chat_id,plan,status,price_rub,provider,provider_customer_id,
      provider_subscription_id,started_at,ends_at,created_at,updated_at
    ) values (
      v_order.chat_id,v_order.plan,'active',v_order.amount_rub,'yookassa',null,
      _payment_id,v_now,v_period_end,v_now,v_now
    );

    return jsonb_build_object(
      'ok',true,'duplicate',false,'order_id',v_order.id,'chat_id',v_order.chat_id,
      'plan',v_order.plan,'current_period_end',v_period_end
    );
  end if;

  if v_order.status<>'succeeded' then
    update public.payment_orders
       set status=_status,updated_at=v_now,
           metadata=metadata||jsonb_build_object('provider_payload',coalesce(_payload,'{}'::jsonb))
     where id=v_order.id;
  end if;

  return jsonb_build_object(
    'ok',true,'duplicate',false,'order_id',v_order.id,'chat_id',v_order.chat_id,
    'plan',v_order.plan,'status',_status
  );
end;
$$;

revoke all on function public.prepare_yookassa_order_v1(bigint,text,integer,text,jsonb) from public,anon,authenticated;
revoke all on function public.process_yookassa_payment(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_yookassa_order_v1(bigint,text,integer,text,jsonb) to service_role;
grant execute on function public.process_yookassa_payment(text,text,jsonb) to service_role;
