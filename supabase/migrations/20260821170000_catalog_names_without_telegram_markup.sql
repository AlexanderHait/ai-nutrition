-- Название товара из каталога попадает прямо в текст, который бот отправляет
-- в Telegram с разметкой Markdown. Одиночный «_», «*», «`» или «[» открывает
-- сущность, которая не закрывается, и Telegram отклоняет ВСЁ сообщение —
-- человек не получает сводку вообще. Ровно так 21.08 упал утренний план
-- Premium: модель написала «(data_quality: low)».
--
-- В каталоге такая строка уже была: «Шоколад молочный [Alpen Gold] с фундуком»
-- из импорта Open Food Facts. Она находится по штрих-коду, то есть достаточно
-- сфотографировать этот шоколад, чтобы сводка не пришла.
--
-- Чиню там же, где чинил HTML-мусор 13.08 — на самой таблице, а не в узлах:
-- писателей в каталог уже несколько, и следующий повторит ту же ошибку.
-- Правится только display_name — это то, что видит человек. normalized_name
-- участвует в поиске, и трогать его нельзя: изменится сопоставление синонимов.
create or replace function public.clean_food_name(_s text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select nullif(
           btrim(regexp_replace(
             regexp_replace(public.decode_html_entities(_s), '[_*`\[\]]', '', 'g'),
             '\s+', ' ', 'g')),
           '');
$function$;

-- Разовая чистка уже записанного. Это не клиентские данные и не числа:
-- меняется только написание названия товара в каталоге.
update public.food_catalog
   set display_name = public.clean_food_name(display_name)
 where display_name ~ '[_*`\[\]]';

-- Права как у остальных функций проекта: только service_role.
revoke execute on function public.clean_food_name(text) from public, anon, authenticated;
