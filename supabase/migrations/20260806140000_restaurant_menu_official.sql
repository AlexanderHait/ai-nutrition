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

-- Подбор позиции чека по официальному меню: имя строки и её цена.
-- Цена сама по себе не опознаёт товар (за 85 ₽ в меню несколько разных позиций),
-- поэтому засчитывается только вместе с общим содержательным словом.
create or replace function public.lookup_restaurant_menu_official(_queries jsonb)
returns table(
  idx integer, raw text, menu_id bigint, official_name text, portion_grams numeric,
  price_rub numeric, price_matches boolean, match_type text, source_url text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with q as (
    select
      coalesce((x->>'idx')::integer, ordinality::integer - 1) as idx,
      x->>'raw' as raw,
      nullif(x->>'price','')::numeric as price,
      translate(public.normalize_food_query_with_brand_v2(x->>'raw', x->>'brand'), 'ё', 'е') as norm
    from jsonb_array_elements(coalesce(_queries, '[]'::jsonb)) with ordinality as e(x, ordinality)
  ),
  qq as (
    select q.*, regexp_replace(q.norm,
      '^(rostics|kfc|вкусно и точка|теремок|шоколадница|додо|spar|вкусвилл|дикси|ашан|пятерочка|чижик|самокат|лавка|drinkit)\s+','') as qc
    from q
  ),
  m as (
    select r.id, r.name, r.portion_grams, r.price_rub, r.source_url,
           translate(r.normalized_name, 'ё', 'е') as nc,
           regexp_replace(translate(r.normalized_name, 'ё', 'е'),
             '^(rostics|kfc|вкусно и точка|теремок|шоколадница|додо|spar|вкусвилл|дикси|ашан|пятерочка|чижик|самокат|лавка|drinkit)\s+','') as mc
    from public.restaurant_menu_official r
  ),
  cand as (
    select qq.idx, qq.raw, m.id, m.name, m.portion_grams, m.price_rub, m.source_url,
           (qq.price is not null and abs(m.price_rub - qq.price) <= 0.5) as price_ok,
           levenshtein(m.mc, qq.qc) as dist,
           exists (
             select 1 from unnest(string_to_array(qq.qc,' ')) t
             where length(t) >= 4 and (' '||m.mc||' ') like ('% '||t||' %')
           ) as shares_word,
           qq.qc, m.mc
    from qq join m on true
    where length(qq.qc) >= 3
  ),
  typed as (
    select c.*,
      case
        when c.mc = c.qc then 'name_exact'
        when regexp_replace(c.mc,'[^a-zа-я0-9]','','g') = regexp_replace(c.qc,'[^a-zа-я0-9]','','g') then 'name_compact'
        when c.price_ok and c.shares_word then 'name_price'
        when c.mc ~ ('^' || (select string_agg(t || '[^ ]*', ' ' order by o)
                             from unnest(string_to_array(c.qc,' ')) with ordinality u(t,o) where t <> '')) then 'name_prefix'
        when c.dist <= greatest(1, least(3, (greatest(length(c.mc), length(c.qc)) * 0.15)::int)) then 'name_typo'
      end as mt
    from cand c
  ),
  best as (
    select t.*,
      row_number() over (partition by t.idx order by
        case t.mt when 'name_exact' then 0 when 'name_compact' then 1 when 'name_price' then 2
                  when 'name_prefix' then 3 when 'name_typo' then 4 end,
        (not t.price_ok), t.dist, length(t.name)) rn
    from typed t where t.mt is not null
  )
  select b.idx, b.raw, b.id, b.name, b.portion_grams, b.price_rub, b.price_ok, b.mt, b.source_url
  from best b where b.rn = 1;
$$;

revoke execute on function public.lookup_restaurant_menu_official(jsonb) from public, anon, authenticated;
