-- Первичная настройка кабинета не сохранялась: «Проверь заполненные данные.
-- Ничего не было сохранено». Данные были верные — падало сохранение, и обе
-- ошибки показывались одним текстом.
--
-- Две причины, обе про пользователей, зарегистрированных по почте:
-- у них нет Telegram, то есть chat_id пуст.

-- 1. Код пишет настройки через upsert по account_id, а уникальность в таблице
--    была только по chat_id. Для веб-пользователей запрос всегда падал на
--    «нет уникального ограничения для ON CONFLICT».
--    NULL в Postgres между собой не конфликтуют, поэтому строки из Telegram
--    без account_id ограничение не затрагивает.
alter table public.client_settings
  add constraint client_settings_account_id_key unique (account_id);

-- 2. Триггеры AI Core пишут события по chat_id и падали с invalid_chat_id,
--    обрушивая сохранение анкеты и записи веса. Часть соседних триггеров
--    такую проверку уже имела — доводим до общего вида.
create or replace function public.ai_core_refresh_on_production_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare cid bigint; last_generated timestamptz;
begin
  cid:=coalesce(new.chat_id,old.chat_id);
  if cid is null or cid<=0 then
    return coalesce(new,old);
  end if;
  select generated_at into last_generated from public.ai_profiles where chat_id=cid;
  if tg_table_name in ('client_settings','weight_logs') or last_generated is null or last_generated<now()-interval '6 hours' then
    perform public.ai_core_refresh_client(cid,7);
  end if;
  return coalesce(new,old);
end $function$;

create or replace function public.teddy_ai_core_capture_settings()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.chat_id is null then return new; end if;
  if tg_op = 'INSERT' or
     old.goal is distinct from new.goal or
     old.current_weight_kg is distinct from new.current_weight_kg or
     old.target_weight_kg is distinct from new.target_weight_kg or
     old.kcal_target is distinct from new.kcal_target or
     old.protein_target is distinct from new.protein_target or
     old.fat_target is distinct from new.fat_target or
     old.carb_target is distinct from new.carb_target or
     old.activity_level is distinct from new.activity_level then
    perform public.ai_core_record_event(
      new.chat_id,
      case when tg_op='INSERT' then 'profile_created' else 'targets_updated' end,
      case when tg_op='INSERT' then 'Профиль питания создан' else 'Цели и профиль обновлены' end,
      new.goal,
      jsonb_build_object(
        'goal', new.goal,
        'current_weight_kg', new.current_weight_kg,
        'target_weight_kg', new.target_weight_kg,
        'kcal_target', new.kcal_target,
        'protein_target', new.protein_target,
        'fat_target', new.fat_target,
        'carb_target', new.carb_target,
        'activity_level', new.activity_level,
        'updated_at', new.updated_at
      ),
      'database_trigger',
      new.chat_id::text,
      'settings:' || new.chat_id::text
    );
  end if;
  return new;
end;
$function$;

create or replace function public.teddy_ai_core_capture_weight()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.chat_id is null then return new; end if;
  perform public.ai_core_record_event(
    new.chat_id,
    'weight_logged',
    'Вес обновлён',
    new.weight_kg::text || ' кг',
    jsonb_build_object('weight_log_id',new.id,'weight_kg',new.weight_kg,'measured_at',new.measured_at),
    'database_trigger',
    new.id::text,
    'weight:' || new.id::text
  );
  return new;
end;
$function$;

create or replace function public.teddy_ai_core_capture_meal()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.chat_id is null then return new; end if;
  if tg_op = 'INSERT' then
    perform public.ai_core_record_event(
      new.chat_id,
      'meal_saved',
      'Приём пищи сохранён',
      new.dish,
      jsonb_build_object(
        'meal_id', new.id,
        'dish', new.dish,
        'grams', new.grams,
        'kcal', new.kcal,
        'protein', new.prot,
        'fat', new.fat,
        'carbs', new.carb,
        'eaten_at', new.eaten_at,
        'eaten_day', new.eaten_day,
        'deleted', coalesce(new.deleted,false)
      ),
      'database_trigger',
      new.id::text,
      'meal:' || new.id::text
    );
  elsif tg_op = 'UPDATE' and (
    old.dish is distinct from new.dish or
    old.grams is distinct from new.grams or
    old.kcal is distinct from new.kcal or
    old.prot is distinct from new.prot or
    old.fat is distinct from new.fat or
    old.carb is distinct from new.carb or
    old.deleted is distinct from new.deleted or
    old.eaten_at is distinct from new.eaten_at or
    old.eaten_day is distinct from new.eaten_day
  ) then
    perform public.ai_core_record_event(
      new.chat_id,
      case when coalesce(new.deleted,false) then 'meal_deleted' else 'meal_updated' end,
      case when coalesce(new.deleted,false) then 'Приём пищи удалён' else 'Приём пищи изменён' end,
      new.dish,
      jsonb_build_object(
        'meal_id', new.id,
        'dish', new.dish,
        'grams', new.grams,
        'kcal', new.kcal,
        'protein', new.prot,
        'fat', new.fat,
        'carbs', new.carb,
        'eaten_at', new.eaten_at,
        'eaten_day', new.eaten_day,
        'deleted', coalesce(new.deleted,false)
      ),
      'database_trigger',
      new.id::text,
      'meal:' || new.id::text
    );
  end if;
  return new;
end;
$function$;
