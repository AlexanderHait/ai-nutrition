-- Телеметрия писалась, но искать по ней было нельзя.
--
-- Все узлы телеметрии отдают metadata через JSON.stringify(...), а колонка
-- у нас jsonb. PostgREST принимает строку и честно кладёт в jsonb **строку**,
-- а не объект. Поэтому metadata->>'response_chars' и metadata->>'empty_answer'
-- всегда возвращали null — то есть готовые запросы из заметок не работали,
-- хотя данные лежали рядом, внутри строки.
--
-- 95 строк из 196 записаны так: фото, чат, дневная сводка, дайджест
-- и утренний план — то есть всё, что инструментировано после 07.08.
--
-- Чиню на самой таблице, а не в пяти узлах четырёх workflow: писателей уже
-- пять, завтра появится шестой, и он повторит ту же ошибку. Тот же приём,
-- что у food_catalog_clean_names_trg.
create or replace function public.ai_usage_events_normalize_metadata()
returns trigger
language plpgsql
-- search_path задан явно: без него advisors ставят function_search_path_mutable,
-- и это правило по проекту уже закрыто (см. «Открытые технические долги»).
set search_path to 'public'
as $function$
begin
  -- Интересует ровно один случай: в jsonb лежит строка, а внутри неё JSON-объект.
  if jsonb_typeof(new.metadata) = 'string' then
    begin
      new.metadata := (new.metadata #>> '{}')::jsonb;
    exception when others then
      -- Не разобралось — оставляем как есть. Телеметрия не имеет права
      -- ронять запись о вызове AI: без неё мы теряем и сам факт вызова.
      null;
    end;

    -- Строка внутри строки объектом не станет: пусть лучше останется строкой,
    -- чем притворится структурой.
    if jsonb_typeof(new.metadata) <> 'object' then
      new.metadata := to_jsonb(new.metadata #>> '{}');
    end if;
  end if;

  return new;
end $function$;

drop trigger if exists ai_usage_events_normalize_metadata_trg on public.ai_usage_events;
create trigger ai_usage_events_normalize_metadata_trg
  before insert or update of metadata on public.ai_usage_events
  for each row execute function public.ai_usage_events_normalize_metadata();

-- Разовая починка уже записанного. Это телеметрия, а не клиентские данные:
-- форма записи меняется, содержимое — нет.
update public.ai_usage_events
   set metadata = (metadata #>> '{}')::jsonb
 where jsonb_typeof(metadata) = 'string'
   and (metadata #>> '{}') ~ '^\s*\{';
