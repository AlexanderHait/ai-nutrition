-- Пометка «проверь» терялась при сохранении из /v.
--
-- Правило по всему проекту: галочка означает, что за числами стоит источник,
-- а догадка обязана быть помечена. 09.08 пометка научилась доживать до дневника
-- (`meals.needs_check`), но проверка данных 21.08 показала дыру:
--
--   35% дневника — это `nutrition_source = 'estimate'`, то есть чистая догадка
--   модели, и 8 записей из 18 лежат там БЕЗ пометки.
--
-- Причина — расхождение в словаре. Пути называют пометку по-разному:
--   * фото и /day кладут поле `needs_check` (или `uncertain`);
--   * /v кладёт поле **`quality`** со значением `check` или `bad`.
-- А эта функция читала только `needs_check`, `uncertain` и `check` — поля с
-- именем `quality` в списке не было, поэтому /v всегда записывался как
-- «проверено». Видно на живом черновике 544 от 15.08: у всех трёх позиций
-- `quality: "check"`, `needs_check: null` — и в дневнике пометки нет.
--
-- Что это значило на практике: «Фруктоза» 30 г ушла в дневник как 54 ккал
-- (на деле ~120, сахар это 4 ккал/г), «Мальтодектрин» 60 г — как 108 вместо
-- ~240. Обе позиции — модельная догадка 180 ккал на 100 г, отмасштабированная
-- по весу, и обе выглядели в дневнике как обычные проверенные записи.
--
-- Чиню здесь, а не в узле n8n: это единственная точка входа в `meals` —
-- фото, /v и /day сохраняются только через неё. Значит правило про пометку
-- стоит ровно там, где его нельзя обойти, и следующий путь записи получит
-- его бесплатно.
--
-- Правится ТОЛЬКО выражение для needs_check_v: определение функции берётся
-- из базы и меняется текстовой заменой, поэтому остальные ~200 строк логики
-- (блокировка, идемпотентность, статусы, счётчики) остаются байт в байт.
do $$
declare
  def text;
  newdef text;
  old_expr constant text :=
    'needs_check_v := coalesce((item->>''needs_check'')::boolean,(item->>''uncertain'')::boolean,(item->>''check'')::boolean,false);';
  new_expr constant text :=
    'needs_check_v := coalesce((item->>''needs_check'')::boolean,(item->>''uncertain'')::boolean,(item->>''check'')::boolean,'
    || 'case lower(btrim(coalesce(item->>''quality'','''')))'
    || ' when ''check'' then true when ''bad'' then true when ''ok'' then false else null end,'
    || 'false);';
begin
  select pg_get_functiondef(p.oid) into def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'commit_meal_draft_v20';

  if def is null then
    raise exception 'commit_meal_draft_v20 не найдена';
  end if;

  newdef := replace(def, old_expr, new_expr);
  if newdef = def then
    raise exception 'выражение needs_check_v не найдено — определение изменилось, правку надо пересобрать';
  end if;

  execute newdef;
end $$;

-- Разовое восстановление уже сохранённого.
--
-- Числа НЕ трогаю — это клиентские данные. Ставится только пометка, и только
-- там, где она обязана стоять по действующему правилу: КБЖУ без источника.
-- Пометка добавляется, но никогда не снимается, поэтому испортить запись,
-- у которой источник есть, эта правка не может.
update public.meals
   set needs_check = true
 where nutrition_source = 'estimate'
   and needs_check is not true;
