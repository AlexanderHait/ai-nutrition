-- HTML-мусор в названиях каталога еды.
--
-- Open Food Facts отдаёт названия в HTML-виде. Товар приехал в каталог как
-- «Сухарики со вкусом &quot;Сливочный лосось&quot;» и ровно так был показан
-- пользователю в сводке 12.08. В нормализованных именах мусора оказалось
-- намного больше: 430 позиций содержали слово «quot» там, где в исходнике
-- стояли кавычки.
--
-- Чинить в одном писателе мало: в каталог пишут cache_barcode_food (живой
-- запрос в OFF), import_off_barcode_page (массовая заливка) и
-- cache_verified_external_food_catalog (веб-источники), и завтра появится
-- четвёртый. Поэтому правило стоит на самой таблице триггером — забыть его
-- нельзя, и старые вызовы менять не пришлось.

create or replace function public.decode_html_entities(_s text)
returns text language sql immutable set search_path = public as $$
  -- &amp; раскрывается последним, иначе «&amp;quot;» превратится в кавычку.
  select case when _s is null then null else
    replace(
      replace(replace(replace(replace(replace(
      replace(replace(replace(replace(_s,
        '&quot;', '"'), '&#34;', '"'), '&apos;', ''''), '&#39;', ''''),
        '&laquo;', '«'), '&raquo;', '»'), '&nbsp;', ' '), '&lt;', '<'), '&gt;', '>'),
      '&amp;', '&')
  end;
$$;

comment on function public.decode_html_entities(text) is
  'Раскрывает HTML-сущности. Нужна каталогу еды: Open Food Facts отдаёт названия в HTML-виде.';

create or replace function public.clean_food_name(_s text)
returns text language sql immutable set search_path = public as $$
  select nullif(btrim(regexp_replace(public.decode_html_entities(_s), '\s+', ' ', 'g')), '');
$$;

comment on function public.clean_food_name(text) is
  'Витринное имя товара: раскрывает HTML-сущности и схлопывает пробелы.';

-- Нормализованное имя приходит уже без знаков препинания, поэтому сущность
-- успевает превратиться в слово: «quot», «amp», «nbsp». Как самостоятельные
-- слова они в названиях еды не встречаются, поэтому убираем их целиком.
-- Проверено: «амперметр» и «ампула» не затронуты.
create or replace function public.clean_normalized_food_name(_s text)
returns text language sql immutable set search_path = public as $$
  select nullif(btrim(regexp_replace(
           regexp_replace(public.decode_html_entities(_s),
             '(^|\s)(quot|amp|nbsp|apos|laquo|raquo)(?=\s|$)', ' ', 'g'),
           '\s+', ' ', 'g')), '');
$$;

comment on function public.clean_normalized_food_name(text) is
  'Нормализованное имя товара: убирает остатки HTML-сущностей, ставшие словами.';

create or replace function public.food_catalog_clean_names()
returns trigger language plpgsql set search_path = public as $$
begin
  -- coalesce: если после чистки не осталось ничего, лучше прежнее имя, чем пустое.
  new.display_name := coalesce(public.clean_food_name(new.display_name), new.display_name);
  new.normalized_name := coalesce(public.clean_normalized_food_name(new.normalized_name), new.normalized_name);
  return new;
end;
$$;

drop trigger if exists food_catalog_clean_names_trg on public.food_catalog;
create trigger food_catalog_clean_names_trg
  before insert or update of display_name, normalized_name on public.food_catalog
  for each row execute function public.food_catalog_clean_names();

create or replace function public.food_catalog_aliases_clean_names()
returns trigger language plpgsql set search_path = public as $$
begin
  new.alias_normalized := coalesce(public.clean_normalized_food_name(new.alias_normalized), new.alias_normalized);
  return new;
end;
$$;

drop trigger if exists food_catalog_aliases_clean_names_trg on public.food_catalog_aliases;
create trigger food_catalog_aliases_clean_names_trg
  before insert or update of alias_normalized on public.food_catalog_aliases
  for each row execute function public.food_catalog_aliases_clean_names();

-- Чиним то, что уже лежит в базе.
update public.food_catalog c
   set display_name = public.clean_food_name(display_name)
 where display_name ~ '&[a-zA-Z]{2,6};|&#\d+;';

-- Два товара после чистки столкнулись бы с уже существующим именем: это разные
-- позиции одной линейки с разными штрих-кодами («Крупа Пшено шлифованное»
-- Карачихи и «Котлеты по-домашнему» Ложкаревъ). Ни одну из них удалять нельзя,
-- поэтому такие строки оставляем как есть — по штрих-коду они находятся.
update public.food_catalog c
   set normalized_name = public.clean_normalized_food_name(normalized_name)
 where normalized_name ~ '&[a-zA-Z]{2,6};|&#\d+;|(^|\s)(quot|amp|nbsp|apos|laquo|raquo)(\s|$)'
   and not exists (
     select 1 from public.food_catalog o
      where o.id <> c.id
        and o.normalized_name = public.clean_normalized_food_name(c.normalized_name)
   );

update public.food_catalog_aliases a
   set alias_normalized = public.clean_normalized_food_name(alias_normalized)
 where alias_normalized ~ '&[a-zA-Z]{2,6};|&#\d+;|(^|\s)(quot|amp|nbsp|apos|laquo|raquo)(\s|$)'
   and not exists (
     select 1 from public.food_catalog_aliases o
      where o.food_catalog_id = a.food_catalog_id
        and o.alias_normalized = public.clean_normalized_food_name(a.alias_normalized)
   );

-- Права как у всех остальных: обращения идут только через service_role.
revoke all on function public.decode_html_entities(text) from public, anon, authenticated;
revoke all on function public.clean_food_name(text) from public, anon, authenticated;
revoke all on function public.clean_normalized_food_name(text) from public, anon, authenticated;
