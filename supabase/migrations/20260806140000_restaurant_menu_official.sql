-- Официальное меню сети: название, порция и цена прямо с сайта бренда.
--
-- Зачем отдельная таблица, а не food_catalog: у «Вкусно — и точка» на официальном сайте
-- НЕТ КБЖУ — публикуются только название, вес порции и цена, а food_catalog требует
-- калорийность. Эти три поля всё равно бесценны: вес порции перестаёт браться с фанатских
-- сайтов (они давали 251 г вместо официальных 240 г), цена позволяет проверить строку чека,
-- а официальное название чинит опознание («ПИРОЖОК ВИШНЕВЫЙ» вместо «Пирожок»).
--
-- Источник: https://vkusnoitochka.ru/api/menu/city/5dfc9fd451f0dc92455bee95

create table if not exists public.restaurant_menu_official (
  id bigserial primary key,
  brand text not null,
  name text not null,
  normalized_name text not null,
  portion_grams numeric,
  price_rub numeric,
  slug text,
  source_url text not null,
  fetched_at timestamptz not null default now(),
  unique (brand, normalized_name)
);

create index if not exists restaurant_menu_official_brand_idx
  on public.restaurant_menu_official (brand, normalized_name);
create index if not exists restaurant_menu_official_price_idx
  on public.restaurant_menu_official (brand, price_rub);

alter table public.restaurant_menu_official enable row level security;

create or replace function public.import_vit_official_menu()
returns table(fetched int, inserted int, updated int)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _body jsonb; _f int := 0; _i int := 0; _u int := 0;
begin
  select h.content::jsonb into _body
  from extensions.http((
    'GET',
    'https://vkusnoitochka.ru/api/menu/city/5dfc9fd451f0dc92455bee95',
    array[extensions.http_header('User-Agent','Mozilla/5.0'), extensions.http_header('Accept','application/json')],
    null, null)::extensions.http_request) h;

  if _body is null or _body->'products' is null then
    return query select 0, 0, 0; return;
  end if;

  with raw as (
    select
      trim(v->>'name') as name,
      trim(v->>'slug') as slug,
      nullif(v->>'price','')::numeric as price,
      -- «240 г» и «500 мл» — реальные порции. «Большой», «Средний» — размеры комбо, не вес.
      case when v->>'size' ~ '^\s*\d+(\.\d+)?\s*(г|мл)\s*$'
           then regexp_replace(v->>'size', '[^0-9.]', '', 'g')::numeric end as grams
    from jsonb_each(_body->'products') e(k, v)
    where jsonb_typeof(v) = 'object'
  ), clean as (
    select r.*, public.normalize_food_query_with_brand_v2(r.name, 'Вкусно — и точка') as norm
    from raw r
    where r.name is not null and length(r.name) >= 3
      and r.name !~* '(стикер|игрушк|карта|открытк|значок|мерч)'
  ), uniq as (
    -- Одно и то же блюдо встречается несколькими карточками (комбо со слагами _1).
    -- Берём ту, у которой есть вес порции, затем самую дешёвую и с коротким слагом.
    select distinct on (c.norm) c.*
    from clean c
    where c.norm is not null and length(c.norm) >= 3
    order by c.norm, (c.grams is null), c.price nulls last, length(coalesce(c.slug,''))
  ), ins as (
    insert into public.restaurant_menu_official (brand, name, normalized_name, portion_grams, price_rub, slug, source_url)
    select 'Вкусно — и точка', u.name, u.norm, u.grams, u.price, u.slug,
           'https://vkusnoitochka.ru/menu/' || coalesce(u.slug,'')
    from uniq u
    on conflict (brand, normalized_name) do update
      set portion_grams = excluded.portion_grams,
          price_rub = excluded.price_rub,
          slug = excluded.slug,
          name = excluded.name,
          fetched_at = now()
    returning (xmax = 0) as is_insert
  )
  select (select count(*) from uniq),
         (select count(*) from ins where is_insert),
         (select count(*) from ins where not is_insert)
  into _f, _i, _u;

  return query select _f, _i, _u;
end $$;

revoke execute on function public.import_vit_official_menu() from public, anon, authenticated;

-- Запуск (выполнено 06.08.2026: 328 позиций):
--   select * from public.import_vit_official_menu();
