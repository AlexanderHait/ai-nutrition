-- Подбор конкретных товаров по магазину — 11.08.2026
--
-- AI-чат отвечал категориями: «питьевой йогурт без сахара». Человеку в зале
-- это не помогает — ему нужно название, которое он найдёт на полке.
-- В каталоге для этого уже всё есть: 5584 товара со штрих-кодом, брендом
-- и КБЖУ. Не хватало только способа спросить «что из этого есть в Пятёрочке».
--
-- Магазин определяется по собственным маркам сети. Логика намеренно разная:
--   * у ВкусВилла, Самоката, Лавки и Азбуки Вкуса полка почти целиком своя,
--     поэтому для них отдаём ТОЛЬКО их собственные марки;
--   * у Пятёрочки, Магнита, Ленты, Перекрёстка и прочих больших сетей полка
--     общая, поэтому отдаём их собственную марку плюс любые общероссийские
--     бренды — но никогда чужую собственную марку («Красная цена» в Магните
--     не встречается).
-- Магазин не указан или незнаком — ищем по всему каталогу.

create table if not exists public.retail_chain_brands (
  chain text not null,
  brand_key text not null,
  primary key (chain, brand_key)
);

comment on table public.retail_chain_brands is
  'Собственные торговые марки розничных сетей. Используется search_shop_products_v1.';

insert into public.retail_chain_brands(chain, brand_key) values
  ('вкусвилл','вкусвилл'), ('вкусвилл','вв'),
  ('пятерочка','красная цена'),
  ('магнит','моя цена'), ('магнит','магнит'),
  ('лента','365 дней'),
  ('перекресток','global village'), ('перекресток','зеленая линия'),
  ('самокат','самокат'),
  ('лавка','лавка'), ('лавка','яндекс лавка'),
  ('азбука вкуса','азбука вкуса'),
  ('дикси','дикси'), ('дикси','первым делом'),
  ('чижик','чижик'),
  ('ашан','ашан'), ('ашан','каждый день'),
  ('окей','окей')
on conflict do nothing;

create or replace function public.search_shop_products_v1(
  _query text default null,
  _store text default null,
  _min_protein_per_100 numeric default null,
  _max_kcal_per_100 numeric default null,
  _limit integer default 8
)
returns table (
  product text,
  brand text,
  category text,
  kcal_per_100 numeric,
  prot_per_100 numeric,
  fat_per_100 numeric,
  carb_per_100 numeric,
  package_grams numeric,
  kcal_per_package numeric,
  prot_per_package numeric,
  fat_per_package numeric,
  carb_per_package numeric,
  barcode text,
  matched_words integer,
  store_matched text
)
language sql
stable
security definer
set search_path = public
as $$
with norm as (
  select
    nullif(btrim(regexp_replace(lower(replace(coalesce(_store,''), 'ё', 'е')), '[^a-zа-я0-9 ]+', ' ', 'g')), '') as store_raw,
    btrim(regexp_replace(lower(replace(coalesce(_query,''), 'ё', 'е')), '[^a-zа-я0-9]+', ' ', 'g')) as q
),
chain as (
  -- «в перекрестке» не содержит «перекресток», поэтому сравниваем по основе.
  select c.chain
  from norm n
  cross join (select distinct chain from public.retail_chain_brands) c
  where n.store_raw is not null
    and n.store_raw like '%' || left(c.chain, greatest(4, length(c.chain) - 2)) || '%'
  order by length(c.chain) desc
  limit 1
),
own as (
  select brand_key from public.retail_chain_brands where chain = (select chain from chain)
),
foreign_own as (
  select brand_key from public.retail_chain_brands where chain is distinct from (select chain from chain)
),
words as (
  -- Основа слова, но совпадение только с НАЧАЛОМ слова: иначе «твор» находится
  -- внутри «быстрорастворимый», и запрос про творог возвращает желатин.
  select '(^|[^a-zа-я0-9])' || (case when length(w) > 5 then left(w, length(w) - 2) else w end) as rx
  from (select unnest(string_to_array((select q from norm), ' ')) as w) t
  where length(w) >= 3
),
base as (
  select
    f.display_name,
    f.brand,
    f.kcal_per_100, f.prot_per_100, f.fat_per_100, f.carb_per_100,
    coalesce(f.package_grams, f.typical_grams) as pack_g,
    f.barcode,
    f.use_count,
    lower(replace(coalesce(f.brand,''), 'ё', 'е')) as brand_l,
    lower(replace(coalesce(f.display_name,'') || ' ' || coalesce(f.normalized_name,''), 'ё', 'е')) as hay
  from public.food_catalog f
  where f.is_active
    and f.kcal_per_100 is not null
    and length(btrim(coalesce(f.display_name,''))) >= 3
),
hit as (
  select b.*, (select count(*)::int from words w where b.hay ~ w.rx) as mw
  from base b
)
select
  h.display_name,
  h.brand,
  -- Категория нужна боту, чтобы не собрать «обед» из творога, йогурта
  -- и снова творога. См. миграцию 20260811100000_food_category.sql.
  public.food_category_ru(h.display_name),
  h.kcal_per_100, h.prot_per_100, h.fat_per_100, h.carb_per_100,
  h.pack_g,
  -- Готовые числа за упаковку. Модель умножает на 100 г с ошибкой: на реальном
  -- ответе дала 295 ккал вместо 377. Пусть складывает готовое.
  round(h.kcal_per_100 * h.pack_g / 100),
  round(h.prot_per_100 * h.pack_g / 100, 1),
  round(h.fat_per_100  * h.pack_g / 100, 1),
  round(h.carb_per_100 * h.pack_g / 100, 1),
  h.barcode,
  h.mw,
  (select chain from chain)
from hit h
-- Ноль означает «не важно»: модель охотнее передаёт 0, чем пропускает параметр,
-- а «ккал не больше нуля» отсекло бы вообще всё.
where (coalesce(_min_protein_per_100, 0) <= 0 or h.prot_per_100 >= _min_protein_per_100)
  and (coalesce(_max_kcal_per_100, 0) <= 0 or h.kcal_per_100 <= _max_kcal_per_100)
  and (
    (select chain from chain) is null
    or exists (select 1 from own o where h.brand_l = o.brand_key or h.brand_l like o.brand_key || '%')
    or (
      (select chain from chain) not in ('вкусвилл','самокат','лавка','азбука вкуса')
      and not exists (
        select 1 from foreign_own o where h.brand_l = o.brand_key or h.brand_l like o.brand_key || '%'
      )
    )
  )
  and ((select count(*) from words) = 0 or h.mw > 0)
order by
  h.mw desc,
  -- Короткое название — обычный товар с полки; длинное чаще узкая экзотика
  -- вроде смеси для блинов. Белок как сортировку не берём: иначе наверх
  -- всплывают желатин и протеиновый порошок.
  length(h.display_name),
  h.use_count desc nulls last,
  h.display_name
limit greatest(1, least(coalesce(_limit, 8), 20));
$$;

comment on function public.search_shop_products_v1 is
  'Поиск конкретных товаров каталога под магазин и запрос. Для AI-чата: название, бренд, КБЖУ на 100 г и готовые числа за упаковку.';

-- Правило проекта: создавая RPC, сразу отзывать права у всех, кроме service_role.
revoke all on function public.search_shop_products_v1(text, text, numeric, numeric, integer)
  from public, anon, authenticated;
revoke all on table public.retail_chain_brands from public, anon, authenticated;
