-- Оплата падала на первом же шаге: «Не удалось подготовить заказ».
--
-- Имена колонок из RETURNS TABLE (id, account_id, plan, status, ...) внутри
-- функции одновременно являются переменными PL/pgSQL. Два запроса обращались
-- к колонкам id, status и plan без алиаса таблицы, поэтому Postgres падал с
-- ошибкой 42702 «column reference is ambiguous» ещё до обращения к ЮKassa.
-- Ни один заказ не мог быть создан.
--
-- Исправление: у таблиц появились алиасы, все колонки уточнены. Логика,
-- проверки суммы и аккаунта не менялись.

CREATE OR REPLACE FUNCTION public.prepare_yookassa_order_account_v1(
  _account_id uuid,
  _plan text,
  _amount_rub integer,
  _receipt_email text DEFAULT NULL::text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  id uuid, account_id uuid, chat_id bigint, plan text, amount_rub integer,
  currency text, provider text, provider_payment_id text, idempotency_key uuid,
  status text, confirmation_url text, receipt_email text, metadata jsonb,
  created_at timestamp with time zone, reused boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_now timestamptz:=clock_timestamp();
  v_order public.payment_orders%rowtype;
  v_price integer;
  v_chat bigint;
begin
  select ca.telegram_id into v_chat
  from public.customer_accounts ca
  where ca.id=_account_id and ca.status='active';
  if not found then raise exception using errcode='P0002',message='account not found'; end if;

  if _plan not in ('basic','premium') then raise exception using errcode='22023',message='invalid plan'; end if;

  select sp.price_rub into v_price
  from public.subscription_products sp
  where sp.plan=_plan and sp.enabled=true;
  if v_price is null or v_price<>_amount_rub then raise exception using errcode='22023',message='subscription price mismatch'; end if;

  perform pg_advisory_xact_lock(hashtextextended('yookassa-order:'||_account_id::text||':'||_plan,0));

  select o.* into v_order from public.payment_orders o
  where o.account_id=_account_id and o.plan=_plan and o.provider='yookassa' and o.status='pending'
    and o.amount_rub=_amount_rub and o.created_at>=v_now-interval '30 minutes'
  order by o.created_at desc limit 1 for update;

  if found then
    update public.payment_orders o
       set receipt_email=coalesce(nullif(trim(coalesce(_receipt_email,'')),''),o.receipt_email),
           metadata=o.metadata||coalesce(_metadata,'{}'::jsonb),
           updated_at=v_now
     where o.id=v_order.id returning o.* into v_order;
    return query select v_order.id,v_order.account_id,v_order.chat_id,v_order.plan,v_order.amount_rub,v_order.currency,v_order.provider,v_order.provider_payment_id,v_order.idempotency_key,v_order.status,v_order.confirmation_url,v_order.receipt_email,v_order.metadata,v_order.created_at,true;
    return;
  end if;

  insert into public.payment_orders(account_id,chat_id,plan,amount_rub,currency,provider,idempotency_key,status,receipt_email,metadata,created_at,updated_at)
  values(_account_id,v_chat,_plan,_amount_rub,'RUB','yookassa',gen_random_uuid(),'pending',nullif(trim(coalesce(_receipt_email,'')),''),coalesce(_metadata,'{}'::jsonb),v_now,v_now)
  returning * into v_order;

  return query select v_order.id,v_order.account_id,v_order.chat_id,v_order.plan,v_order.amount_rub,v_order.currency,v_order.provider,v_order.provider_payment_id,v_order.idempotency_key,v_order.status,v_order.confirmation_url,v_order.receipt_email,v_order.metadata,v_order.created_at,false;
end;
$function$;
