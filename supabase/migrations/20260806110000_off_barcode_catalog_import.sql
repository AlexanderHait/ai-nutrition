-- Каталог магазинных товаров по штрих-коду из Open Food Facts.
--
-- Зачем. Товар из магазина опознаётся по штрих-коду однозначно, но раньше бот на
-- каждый незнакомый код ходил в Open Food Facts вживую — это 10–15 секунд на запрос
-- и полная зависимость от чужого сервиса. Теперь российский срез лежит локально.
--
-- Безопасность. Данные Open Food Facts краудсорсные и врут: классическая ошибка —
-- порция, помеченная как 100 г. Поэтому импорт живёт в отдельной области каталога
-- 'barcode_off' со статусом 'provisional'. Обе функции поиска (v2 и v3) пускают в
-- поиск по названию только записи со статусом 'verified' или 'official', так что эти
-- строки находятся ИСКЛЮЧИТЕЛЬНО по штрих-коду и не могут дать ложное совпадение по
-- имени. Правок в сами функции поиска не потребовалось.

create extension if not exists http with schema extensions;

-- Контрольная цифра GTIN. Выдуманный или неверно прочитанный код её не проходит.
create or replace function public.gtin_valid(_code text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare d text; s int := 0; w int := 3; i int; chk int;
begin
  d := regexp_replace(coalesce(_code,''), '\D', '', 'g');
  if length(d) not in (8,12,13,14) then return null; end if;
  chk := substr(d, length(d), 1)::int;
  for i in reverse (length(d)-1)..1 loop
    s := s + substr(d, i, 1)::int * w;
    w := case when w = 3 then 1 else 3 end;
  end loop;
  if (10 - s % 10) % 10 = chk then return d; end if;
  return null;
end $$;

-- Масса упаковки из строки вида «Масса нетто: 450 г» или «0,5 л».
-- Нетто обычно стоит первым, поэтому берём наибольшую правдоподобную массу.
create or replace function public.off_mass_g(_text text)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare t text; m text[]; v numeric; u text; g numeric; best numeric := 0;
begin
  t := lower(translate(coalesce(_text,''), 'Ё', 'ё'));
  for m in select regexp_matches(t, '(\d+(?:[.,]\d+)?)\s*(кг|kg|гр|мл|ml|г|g|л|l)(?![a-zа-я0-9])', 'g') loop
    begin v := replace(m[1], ',', '.')::numeric; exception when others then continue; end;
    u := m[2];
    g := case when u in ('кг','kg','л','l') then v * 1000 else v end;
    if g >= 5 and g <= 5000 and g > best then best := g; end if;
  end loop;
  if best > 0 then return round(best); end if;
  return null;
end $$;

-- В названиях Open Food Facts встречаются HTML-сущности: «Марсианка&quot;
create or replace function public.off_clean_name(_s text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(regexp_replace(
    replace(replace(replace(replace(replace(replace(coalesce(_s,''),
      '&quot;','"'), '&amp;','&'), '&#39;',''''), '&laquo;','«'), '&raquo;','»'), '&nbsp;',' '),
    '\s+', ' ', 'g'), '');
$$;

alter table public.food_catalog drop constraint if exists food_catalog_scope_check;
alter table public.food_catalog add constraint food_catalog_scope_check
  check (catalog_scope = any (array['common','branded','restaurant','general','barcode_off']));

-- Загрузка одной страницы поиска Open Food Facts.
create or replace function public.import_off_barcode_page(_q text, _page int)
returns table(fetched int, accepted int, inserted int)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _url text;
  _body jsonb;
  _fetched int := 0;
  _accepted int := 0;
  _inserted int := 0;
begin
  _url := 'https://search.openfoodfacts.org/search?page_size=1000&page=' || _page
       || '&fields=code,product_name,product_name_ru,brands,quantity,nutriments,categories_tags'
       || '&q=' || extensions.urlencode(_q);

  select h.content::jsonb into _body
  from extensions.http(('GET', _url, array[extensions.http_header('User-Agent','TeddY-Nutrition/1.0 (catalog import)')], null, null)::extensions.http_request) h;

  if _body is null or _body->'hits' is null then
    return query select 0, 0, 0; return;
  end if;

  create temp table if not exists _off_page (
    barcode text, nm text, brand text, kcal numeric, prot numeric, fat numeric,
    carb numeric, pkg numeric, cats jsonb
  ) on commit drop;
  delete from _off_page;

  insert into _off_page
  select
    public.gtin_valid(h->>'code'),
    left(public.off_clean_name(coalesce(nullif(trim(h->>'product_name_ru'),''), nullif(trim(h->>'product_name'),''), '')), 120),
    left(trim(case when jsonb_typeof(h->'brands') = 'array' then h->'brands'->>0 else h->>'brands' end), 60),
    nullif(h->'nutriments'->>'energy-kcal_100g','')::numeric,
    nullif(h->'nutriments'->>'proteins_100g','')::numeric,
    nullif(h->'nutriments'->>'fat_100g','')::numeric,
    nullif(h->'nutriments'->>'carbohydrates_100g','')::numeric,
    public.off_mass_g(h->>'quantity'),
    coalesce(h->'categories_tags', '[]'::jsonb)
  from jsonb_array_elements(_body->'hits') h
  where jsonb_typeof(h->'nutriments') = 'object';

  get diagnostics _fetched = row_count;

  with good as (
    select p.*, 4*p.prot + 9*p.fat + 4*p.carb as comp
    from _off_page p
    where p.barcode is not null
      and p.nm is not null and length(p.nm) >= 3 and p.nm ~ '[a-zA-Zа-яА-ЯёЁ]'
      and p.kcal is not null and p.prot is not null and p.fat is not null and p.carb is not null
      and least(p.kcal, p.prot, p.fat, p.carb) >= 0
      and p.kcal <= 950 and greatest(p.prot, p.fat, p.carb) <= 100
      and p.prot + p.fat + p.carb <= 105
  ), sane as (
    select g.* from good g
    where (g.comp = 0 and g.kcal <= 30)
       or (g.comp > 0 and g.kcal between g.comp * 0.5 - 50 and g.comp * 1.5 + 50)
  ), plausible as (
    -- Крауд-данные врут характерно: порцию помечают как 100 г. Плотная еда
    -- не может быть низкокалорийной, а напиток — высококалорийным.
    select s.* from sane s
    where not (s.cats ?| array['en:vegetable-oils','en:olive-oils','en:oils','en:sunflower-oils'] and s.kcal < 700)
      and not (s.cats ?| array['en:chips-and-fries','en:crisps','en:potato-crisps'] and s.kcal < 380)
      and not (s.cats ?| array['en:nuts','en:nuts-and-their-products','en:peanuts','en:almonds'] and s.kcal < 400)
      and not (s.cats ?| array['en:chocolates','en:dark-chocolates','en:milk-chocolates','en:chocolate-candies'] and s.kcal < 330)
      and not (s.cats ?| array['en:biscuits','en:cookies','en:biscuits-and-cakes'] and s.kcal < 300)
      and not (s.cats ?| array['en:butters','en:butter'] and s.kcal < 500)
      and not (s.cats ?| array['en:beverages','en:waters','en:sodas','en:juices','en:teas','en:coffees','en:non-alcoholic-beverages'] and s.kcal > 250)
  ), ranked as (
    select p.*, row_number() over (partition by p.barcode order by length(p.nm) desc) rn
    from plausible p
  ), fresh as (
    select r.*, public.normalize_food_query_with_brand_v2(r.nm, nullif(r.brand,'')) as norm
    from ranked r
    where r.rn = 1
      and not exists (select 1 from public.food_catalog f where f.barcode = r.barcode)
  ), named as (
    -- normalized_name уникален. Столкновение с уже существующей записью или внутри
    -- пачки разводим штрих-кодом: эти строки всё равно ищутся только по коду.
    select f.*,
           case when f.norm is null or length(f.norm) < 3
                     or exists (select 1 from public.food_catalog c where c.normalized_name = f.norm)
                     or count(*) over (partition by f.norm) > 1
                then coalesce(nullif(f.norm,''), 'off') || ' ' || f.barcode
                else f.norm end as final_norm
    from fresh f
  ), ins as (
    insert into public.food_catalog (
      normalized_name, display_name, brand, kcal_per_100, prot_per_100, fat_per_100, carb_per_100,
      package_grams, barcode, source, source_type, source_url, trust_score, confidence,
      verification_status, catalog_scope, is_active, metadata
    )
    select n.final_norm, n.nm, nullif(n.brand,''), n.kcal, n.prot, n.fat, n.carb,
           n.pkg, n.barcode, 'openfoodfacts', 'reliable_web',
           'https://world.openfoodfacts.org/product/' || n.barcode,
           85, 0.85, 'provisional', 'barcode_off', true,
           jsonb_build_object('import', 'openfoodfacts', 'imported_at', now())
    from named n
    on conflict do nothing
    returning 1
  )
  select (select count(*) from plausible), (select count(*) from ins)
  into _accepted, _inserted;

  return query select _fetched, _accepted, _inserted;
end $$;

-- Обход всех страниц одного диапазона: качаем, пока страницы не кончатся.
-- Поиск Open Food Facts отдаёт максимум 10 000 записей на запрос, поэтому запросы
-- разбиваются по диапазонам калорийности.
create or replace function public.import_off_barcode_range(_q text, _max_pages int default 10)
returns table(pages int, fetched int, accepted int, inserted int)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _p int := 1; _f int; _a int; _i int;
  _pages int := 0; _tf int := 0; _ta int := 0; _ti int := 0;
begin
  while _p <= _max_pages loop
    select r.fetched, r.accepted, r.inserted into _f, _a, _i
    from public.import_off_barcode_page(_q, _p) r;
    _pages := _pages + 1; _tf := _tf + _f; _ta := _ta + _a; _ti := _ti + _i;
    exit when coalesce(_f, 0) = 0;
    _p := _p + 1;
  end loop;
  return query select _pages, _tf, _ta, _ti;
end $$;

-- Postgres по умолчанию выдаёт EXECUTE всем. Каталог пишут только служебные вызовы.
revoke execute on function public.gtin_valid(text) from public, anon, authenticated;
revoke execute on function public.off_mass_g(text) from public, anon, authenticated;
revoke execute on function public.off_clean_name(text) from public, anon, authenticated;
revoke execute on function public.import_off_barcode_page(text, int) from public, anon, authenticated;
revoke execute on function public.import_off_barcode_range(text, int) from public, anon, authenticated;

-- Запуск импорта (выполнено 06.08.2026, 5584 позиции):
--   select * from public.import_off_barcode_range('countries_tags:"en:russia" AND nutriments.energy-kcal_100g:[0 TO 125}', 6);
--   select * from public.import_off_barcode_range('countries_tags:"en:russia" AND nutriments.energy-kcal_100g:[125 TO 250}', 5);
--   select * from public.import_off_barcode_range('countries_tags:"en:russia" AND nutriments.energy-kcal_100g:[250 TO 500}', 7);
--   select * from public.import_off_barcode_range('countries_tags:"en:russia" AND nutriments.energy-kcal_100g:[500 TO 1000}', 3);
--   select * from public.import_off_barcode_range('lang:"ru" AND nutriments.energy-kcal_100g:[0 TO 125}', 6);
--   select * from public.import_off_barcode_range('lang:"ru" AND nutriments.energy-kcal_100g:[125 TO 250}', 5);
--   select * from public.import_off_barcode_range('lang:"ru" AND nutriments.energy-kcal_100g:[250 TO 500}', 7);
--   select * from public.import_off_barcode_range('lang:"ru" AND nutriments.energy-kcal_100g:[500 TO 1000}', 3);
