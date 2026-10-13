-- Сутки питания начинаются в 00:00 по Москве — 13.10.2026
--
-- Решение владельца: день в TeddY начинается в 04:00 по Нячангу, то есть
-- в 00:00 по Москве. Раньше (12.08.2026, 20260812080000) он начинался в 03:00.
-- Теперь сутки совпадают с календарными московскими: съеденное после полуночи
-- относится к новому дню.
--
-- Правило живёт в трёх слоях, и сдвигать их можно только вместе (Б-06):
--   1. база — `nutrition_day()`, `nutrition_hour()` и колонка `meals.eaten_day`
--      (здесь). Семь функций бота, коуча и Premium вызывают `nutrition_today()`
--      и `nutrition_hour()` и меняются вместе с ними сами;
--   2. сайт — `NUTRITION_DAY_START_HOUR` в lib/data.ts;
--   3. бот — узлы `Parse day summary`, `Apply photo meal slot`,
--      `Select meals to delete`.
--
-- Час дня возвращается к обычному 0..23: `expected_share` в `nutrition_context`
-- считается от него, и в 00:30 новый день действительно только начался.

create or replace function public.nutrition_day(_ts timestamptz, _tz text default 'Europe/Moscow')
returns date
language sql
immutable
set search_path = public
as $$
  select (_ts at time zone coalesce(_tz, 'Europe/Moscow'))::date;
$$;

comment on function public.nutrition_day(timestamptz, text) is
  'День питания для момента времени. Сутки идут с 00:00 до 23:59 по Москве (04:00 в Нячанге).';

comment on function public.nutrition_today(text) is
  'Текущий день питания. Сутки начинаются в 00:00 по Москве.';

create or replace function public.nutrition_hour(_tz text default 'Europe/Moscow')
returns integer
language sql
stable
set search_path = public
as $$
  select extract(hour from (now() at time zone coalesce(_tz, 'Europe/Moscow')))::int;
$$;

comment on function public.nutrition_hour(text) is
  'Час внутри суток питания: 0..23. Сутки начинаются в 00:00 по Москве.';

revoke all on function public.nutrition_day(timestamptz, text) from public, anon, authenticated;
revoke all on function public.nutrition_today(text) from public, anon, authenticated;
revoke all on function public.nutrition_hour(text) from public, anon, authenticated;

-- Генерируемая колонка пересчитывается для всех строк сразу, индексы по ней
-- перестраиваются. Это производная величина, а не введённые человеком данные:
-- на 13.10.2026 переезжают 4 записи из 201 — съеденные между 00:00 и 03:00 МСК
-- уходят из вчера в свой календарный день.
alter table public.meals
  alter column eaten_day
  set expression as ((eaten_at at time zone 'Europe/Moscow')::date);
