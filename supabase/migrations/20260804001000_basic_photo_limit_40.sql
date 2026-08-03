-- Basic расширен до 40 фото-анализов в месяц: 10 хватало на пару дней и
-- тариф выглядел бесполезным. Преимущество Premium теперь держится на
-- безлимитных AI-запросах и коуче, а не на голоде по фото.
update public.subscription_products
   set photo_limit=40
 where plan='basic';

-- Запасное значение в функции лимитов приведено к тому же числу,
-- чтобы база и код не расходились, если строка тарифа пропадёт.
create or replace function public.subscription_plan_limits_v1(_plan text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_plan text:=lower(coalesce(nullif(trim(_plan),''),'free'));
  v_photo integer;
  v_ai integer;
begin
  if v_plan='premium' then
    return jsonb_build_object('plan','premium','photo_analysis',null,'ai_request',null);
  end if;

  if v_plan not in ('free','basic') then
    v_plan:='free';
  end if;

  select sp.photo_limit, sp.ai_request_limit into v_photo, v_ai
  from public.subscription_products sp
  where sp.plan=v_plan
  limit 1;

  if v_plan='basic' then
    v_photo:=coalesce(v_photo,40);
    v_ai:=coalesce(v_ai,20);
  else
    v_photo:=coalesce(v_photo,3);
    v_ai:=coalesce(v_ai,5);
  end if;

  return jsonb_build_object('plan',v_plan,'photo_analysis',v_photo,'ai_request',v_ai);
end;
$function$;
