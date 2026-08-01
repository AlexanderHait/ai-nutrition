begin;

create table if not exists public.subscription_products (
  plan text primary key check (plan in ('basic', 'premium')),
  title text not null,
  description text,
  price_rub integer not null check (price_rub > 0),
  period_days integer not null default 30 check (period_days > 0),
  enabled boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.subscription_products (plan, title, description, price_rub, period_days, enabled, sort_order)
values
  ('basic', 'TeddY Basic', 'Трекер питания и персональные КБЖУ', 990, 30, true, 10),
  ('premium', 'TeddY Premium', 'AI-нутрициолог и персональное сопровождение', 2990, 30, true, 20)
on conflict (plan) do update
set title = excluded.title,
    description = excluded.description,
    price_rub = excluded.price_rub,
    period_days = excluded.period_days,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order,
    updated_at = now();

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  chat_id bigint not null,
  plan text not null check (plan in ('basic', 'premium')),
  amount_rub integer not null check (amount_rub > 0),
  currency text not null default 'RUB' check (currency = 'RUB'),
  provider text not null default 'yookassa' check (provider = 'yookassa'),
  provider_payment_id text unique,
  idempotency_key uuid not null unique,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'canceled', 'failed')),
  confirmation_url text,
  receipt_email text,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_chat_created_idx
  on public.payment_orders (chat_id, created_at desc);
create index if not exists payment_orders_status_created_idx
  on public.payment_orders (status, created_at desc);

alter table public.payment_events
  add column if not exists order_id uuid references public.payment_orders(id),
  add column if not exists plan text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.payment_events
  drop constraint if exists payment_events_external_id_key;

create unique index if not exists payment_events_provider_event_external_uidx
  on public.payment_events ((coalesce(provider, '')), event_type, external_id)
  where external_id is not null;

create index if not exists payment_events_order_created_idx
  on public.payment_events (order_id, created_at desc);

alter table public.subscription_products enable row level security;
alter table public.payment_orders enable row level security;

create or replace function public.process_yookassa_payment(
  _payment_id text,
  _status text,
  _payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_order public.payment_orders%rowtype;
  v_lifecycle public.subscription_lifecycle%rowtype;
  v_period_days integer;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_event_type text;
begin
  if nullif(trim(_payment_id), '') is null then
    raise exception using errcode = '22023', message = 'payment id is required';
  end if;

  _status := lower(coalesce(_status, ''));
  if _status not in ('pending', 'succeeded', 'canceled', 'failed') then
    raise exception using errcode = '22023', message = 'unsupported payment status';
  end if;

  select * into v_order
  from public.payment_orders
  where provider = 'yookassa'
    and provider_payment_id = _payment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'payment order not found';
  end if;

  v_event_type := case _status
    when 'succeeded' then 'payment.succeeded'
    when 'canceled' then 'payment.canceled'
    when 'failed' then 'payment.failed'
    else 'payment.pending'
  end;

  insert into public.payment_events (
    order_id, chat_id, provider, event_type, external_id,
    amount_rub, plan, status, payload, created_at, updated_at
  ) values (
    v_order.id, v_order.chat_id, 'yookassa', v_event_type, _payment_id,
    v_order.amount_rub, v_order.plan, _status, coalesce(_payload, '{}'::jsonb), v_now, v_now
  )
  on conflict do nothing;

  if _status = 'succeeded' then
    if v_order.status = 'succeeded' then
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'order_id', v_order.id,
        'chat_id', v_order.chat_id,
        'plan', v_order.plan
      );
    end if;

    select period_days into v_period_days
    from public.subscription_products
    where plan = v_order.plan and enabled = true;

    if v_period_days is null then
      raise exception using errcode = 'P0002', message = 'subscription product not found';
    end if;

    perform pg_advisory_xact_lock(v_order.chat_id);

    select * into v_lifecycle
    from public.subscription_lifecycle
    where chat_id = v_order.chat_id
    for update;

    if found
       and v_lifecycle.plan = v_order.plan
       and v_lifecycle.state in ('trial', 'active', 'grace')
       and v_lifecycle.current_period_end is not null
       and v_lifecycle.current_period_end > v_now then
      v_period_start := coalesce(v_lifecycle.current_period_start, v_now);
      v_period_end := v_lifecycle.current_period_end + make_interval(days => v_period_days);
    else
      v_period_start := v_now;
      v_period_end := v_now + make_interval(days => v_period_days);
    end if;

    update public.payment_orders
    set status = 'succeeded',
        paid_at = coalesce(paid_at, v_now),
        updated_at = v_now,
        metadata = metadata || jsonb_build_object('provider_payload', coalesce(_payload, '{}'::jsonb))
    where id = v_order.id;

    insert into public.subscription_lifecycle (
      chat_id, plan, state, trial_ends_at,
      current_period_start, current_period_end,
      cancel_at_period_end, grace_ends_at,
      provider, provider_customer_id, provider_subscription_id, updated_at
    ) values (
      v_order.chat_id, v_order.plan, 'active', null,
      v_period_start, v_period_end,
      true, null,
      'yookassa', null, _payment_id, v_now
    )
    on conflict (chat_id) do update
    set plan = excluded.plan,
        state = excluded.state,
        trial_ends_at = excluded.trial_ends_at,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        grace_ends_at = excluded.grace_ends_at,
        provider = excluded.provider,
        provider_customer_id = excluded.provider_customer_id,
        provider_subscription_id = excluded.provider_subscription_id,
        updated_at = excluded.updated_at;

    insert into public.subscriptions (
      chat_id, plan, status, price_rub, provider,
      provider_customer_id, provider_subscription_id,
      started_at, ends_at, created_at, updated_at
    ) values (
      v_order.chat_id, v_order.plan, 'active', v_order.amount_rub, 'yookassa',
      null, _payment_id,
      v_now, v_period_end, v_now, v_now
    );

    return jsonb_build_object(
      'ok', true,
      'duplicate', false,
      'order_id', v_order.id,
      'chat_id', v_order.chat_id,
      'plan', v_order.plan,
      'current_period_end', v_period_end
    );
  end if;

  if v_order.status <> 'succeeded' then
    update public.payment_orders
    set status = _status,
        updated_at = v_now,
        metadata = metadata || jsonb_build_object('provider_payload', coalesce(_payload, '{}'::jsonb))
    where id = v_order.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'order_id', v_order.id,
    'chat_id', v_order.chat_id,
    'plan', v_order.plan,
    'status', _status
  );
end;
$$;

revoke all on function public.process_yookassa_payment(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.process_yookassa_payment(text, text, jsonb) to service_role;

commit;
