-- Догадка не должна противоречить тому, что мы уже знаем о бренде — 09.08.2026
--
-- «/v творог exponenta вишня 250 г» дал 400 ккал на 250 г, то есть 160 ккал/100 г.
-- При этом в каталоге лежат 14 товаров Exponenta, и все они от 35 до 87 ккал/100 г:
-- это высокобелковая молочная линейка. Модель придумала число, которое наши
-- собственные данные опровергают, а бот показал его как есть.
--
-- Функция отдаёт «коридор» бренда. Она ничего не решает сама — только сообщает,
-- что известно, и молчит там, где сказать нечего.
--
-- Два условия молчания, оба выстраданы на данных:
--   * меньше трёх товаров — это не коридор, а совпадение;
--   * разброс шире четырёх раз — это розничная сеть, а не линейка продуктов.
--     У «ВкусВилл» 480 позиций от 5.5 до 619.7 ккал/100 г: такой коридор
--     не значит ничего. У Exponenta 35–87, и это уже настоящий признак.
create or replace function public.lookup_brand_nutrition_reference_v1(_brand text)
returns table(
  brand text,
  items integer,
  kcal_min numeric,
  kcal_max numeric,
  kcal_median numeric,
  prot_median numeric,
  fat_median numeric,
  carb_median numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with b as (
    select nullif(btrim(lower(translate(coalesce(_brand,''), 'Ё', 'ё'))), '') as key
  ), rows as (
    select f.kcal_per_100, f.prot_per_100, f.fat_per_100, f.carb_per_100
    from public.food_catalog f, b
    where b.key is not null
      and length(b.key) >= 3
      and f.is_active
      and f.kcal_per_100 is not null
      and lower(translate(coalesce(f.brand,''), 'Ё', 'ё')) = b.key
  )
  select
    (select key from b),
    count(*)::integer,
    min(kcal_per_100),
    max(kcal_per_100),
    percentile_cont(0.5) within group (order by kcal_per_100)::numeric(10,2),
    percentile_cont(0.5) within group (order by prot_per_100)::numeric(10,2),
    percentile_cont(0.5) within group (order by fat_per_100)::numeric(10,2),
    percentile_cont(0.5) within group (order by carb_per_100)::numeric(10,2)
  from rows
  having count(*) >= 3
     and max(kcal_per_100) <= greatest(min(kcal_per_100), 1) * 4;
$$;

revoke execute on function public.lookup_brand_nutrition_reference_v1(text)
  from public, anon, authenticated;
