-- Ночные приёмы пищи считаются в прошлый день — 12.08.2026
--
-- Решение владельца: всё, что съедено до 03:00, относится к предыдущему дню.
-- Человек, который ужинает в час ночи, продолжает вчерашний день, а не
-- начинает новый с одного позднего перекуса.
--
-- Правило живёт в трёх местах, и все три должны сдвигаться вместе, иначе
-- получится расхождение: приём уйдёт во вчера, а «сегодня» останется новым
-- днём, и в /today человек увидит пустой день.
--   1. `meals.eaten_day` — к какому дню отнесён приём (генерируемая колонка);
--   2. «какой сейчас день» в функциях бота, коуча и Premium;
--   3. `dayKey`/`mealDay` на сайте (см. lib/data.ts).
--
-- Час дня тоже сдвигается: сутки питания идут с 03:00 до 02:59, поэтому
-- в час ночи «час дня» равен 25, а не 1. Иначе бот в час ночи считал бы,
-- что день только начался, и ждал бы от человека ещё 88% дневной нормы.

create or replace function public.nutrition_day(_ts timestamptz, _tz text default 'Europe/Moscow')
returns date
language sql
immutable
set search_path = public
as $$
  select (((_ts at time zone coalesce(_tz, 'Europe/Moscow')) - interval '3 hours'))::date;
$$;

comment on function public.nutrition_day(timestamptz, text) is
  'День питания для момента времени. Сутки идут с 03:00 до 02:59, поэтому ночная еда относится к предыдущему дню.';

create or replace function public.nutrition_today(_tz text default 'Europe/Moscow')
returns date
language sql
stable
set search_path = public
as $$
  select public.nutrition_day(now(), _tz);
$$;

comment on function public.nutrition_today(text) is
  'Текущий день питания. До 03:00 возвращает вчерашнюю дату.';

create or replace function public.nutrition_hour(_tz text default 'Europe/Moscow')
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when h < 3 then h + 24
    else h
  end
  from (select extract(hour from (now() at time zone coalesce(_tz, 'Europe/Moscow')))::int as h) t;
$$;

comment on function public.nutrition_hour(text) is
  'Час внутри суток питания: 3..26. В час ночи возвращает 25 — день почти закончился, а не только начался.';

revoke all on function public.nutrition_day(timestamptz, text) from public, anon, authenticated;
revoke all on function public.nutrition_today(text) from public, anon, authenticated;
revoke all on function public.nutrition_hour(text) from public, anon, authenticated;

-- Генерируемая колонка пересчитывается для всех строк сразу. Это производная
-- величина, а не введённые человеком данные, поэтому пересчёт истории —
-- то, что нужно: дневник станет одинаковым и для старых, и для новых записей.
alter table public.meals
  alter column eaten_day
  set expression as (((eaten_at at time zone 'Europe/Moscow') - interval '3 hours')::date);

-- «Сегодня» в существующих функциях. Правим текстом по готовому определению
-- (pg_get_functiondef), чтобы не переписывать по 10 КБ кода руками и не
-- задеть ничего, кроме самой границы суток.
do $do$
declare
  r record;
  src text;
  newsrc text;
  patched int := 0;
begin
  for r in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('bot_client_state_v20','coach_scores_v1','coach_scores_v2',
                        'get_current_summary','premium_contexts','nutrition_context',
                        'ai_core_refresh_client')
  loop
    src := pg_get_functiondef(r.oid);
    newsrc := src;
    newsrc := replace(newsrc, '(now() at time zone ''Europe/Moscow'')::date', 'public.nutrition_today()');
    newsrc := replace(newsrc, 'timezone(''Europe/Moscow'',now())::date', 'public.nutrition_today()');
    newsrc := replace(newsrc, '(NOW() AT TIME ZONE ''Europe/Moscow'')::DATE', 'public.nutrition_today()');
    newsrc := replace(newsrc, '(now() at time zone tz)::date', 'public.nutrition_today(tz)');
    newsrc := replace(newsrc, 'extract(hour from (now() at time zone tz))', 'public.nutrition_hour(tz)');
    -- ai_core_refresh_client считал окно по current_date, то есть по дате
    -- сервера в UTC, а не по московской. Заодно приводим к общему правилу.
    newsrc := replace(newsrc, 'eaten_day>=current_date-(d-1)', 'eaten_day>=public.nutrition_today()-(d-1)');
    if newsrc <> src then
      execute newsrc;
      patched := patched + 1;
    end if;
  end loop;
  raise notice 'Функций приведено к новой границе суток: %', patched;
end
$do$;
