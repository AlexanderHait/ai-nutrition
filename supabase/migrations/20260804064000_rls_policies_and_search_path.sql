-- Два пункта аудита безопасности.

-- 1. У функций расчёта Coach Score не был задан search_path (WARN линтера).
create or replace function public.coach_score_protein_v1(_actual numeric, _target numeric)
returns numeric language sql immutable strict set search_path to 'public' as $function$
  select case
    when _actual/_target between .90 and 1.30 then 100
    when _actual/_target<.90 then greatest(0::numeric,100-(.90-_actual/_target)*125)
    else greatest(0::numeric,100-(_actual/_target-1.30)*50)
  end;
$function$;

create or replace function public.coach_score_symmetric_v1(_actual numeric, _target numeric, _tolerance numeric, _penalty numeric)
returns numeric language sql immutable strict set search_path to 'public' as $function$
  select greatest(0::numeric,least(100::numeric,
    100-greatest(0::numeric,abs(_actual/_target-1)-_tolerance)*_penalty
  ));
$function$;

-- 2. RLS был включён на всех таблицах, но политик не было ни одной.
--    Весь доступ держался на секретном ключе service_role.
--
--    Ключ service_role обходит RLS, поэтому сервер работает как раньше:
--    ни один существующий запрос не затрагивается. Политики нужны вторым
--    рубежом — если ключ утечёт или код обратится с публичным ключом,
--    посторонний увидит только свои строки, а не всю базу клиентов.
--
--    Даём авторизованному пользователю читать только свои данные. Запись
--    остаётся исключительно через сервер: политик на insert/update/delete нет.
--    Служебные таблицы (телеметрия, каталоги, внутренности AI Core, админы,
--    рассылки) намеренно остаются закрытыми полностью — браузеру там делать
--    нечего ни при каких условиях.
do $$
declare t text;
begin
  foreach t in array array[
    'meals','meals_draft','client_settings','weight_logs','profiles',
    'subscriptions','subscription_lifecycle','payment_orders','payment_events',
    'support_messages','ai_timeline','ai_insights','ai_profiles',
    'premium_weekly_reports','premium_recommendations','premium_daily_plans',
    'premium_nudges','digests','chat_logs'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_own_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (account_id = public.current_customer_account_id())',
      t || '_own_select', t
    );
  end loop;
end $$;

drop policy if exists customer_accounts_own_select on public.customer_accounts;
create policy customer_accounts_own_select on public.customer_accounts
  for select to authenticated
  using (id = public.current_customer_account_id());
