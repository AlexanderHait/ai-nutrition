-- Личная память училась на всём, что попало в дневник, без единой проверки.
-- 06.08 дневная сводка записала «Обед:» как блюдо на 180 ккал — и память это запомнила.
-- Дневную сводку я починил, но триггер должен защищаться сам: он последний рубеж
-- перед тем, как ошибка станет «привычкой пользователя» и начнёт подставляться в вес.
--
-- Три новых правила, все про заведомо невозможное, а не про сомнительное:
--   * заголовок приёма пищи — не еда;
--   * в названии должна быть хотя бы одна буква;
--   * плотность выше 9.5 ккал на грамм физически невозможна (чистый жир — 9).
--
-- Проверено: «Обед:», «Ужин», «250» и «Масло сливочное 10 г / 200 ккал» отклонены,
-- «Овсянка на воде 220 г / 180 ккал» запомнена.
create or replace function public.learn_client_food_memory()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare n text; existing_chat bigint;
begin
  if coalesce(new.deleted,false) is true
     or coalesce(new.grams,0)<=0
     or coalesce(new.kcal,0)<=0 then
    return new;
  end if;

  -- «Обед:», «Завтрак» и прочие заголовки — это структура записи, а не блюдо.
  if btrim(coalesce(new.dish,'')) ~* '^(завтрак|обед|ужин|перекус|утро|день|вечер|полдник|ланч)\s*[:.\-—–]*\s*$' then
    return new;
  end if;

  -- Названию нужна хотя бы одна буква, иначе это не еда.
  if coalesce(new.dish,'') !~ '[a-zA-Zа-яА-ЯёЁ]' then
    return new;
  end if;

  -- Физически невозможная плотность: чистый жир — 9 ккал на грамм.
  if new.kcal / nullif(new.grams,0) > 9.5 then
    return new;
  end if;

  n:=public.normalize_food_name(new.dish);
  if length(n)<2 then return new; end if;

  perform pg_advisory_xact_lock(hashtext('food-memory:'||new.chat_id::text||':'||n));

  select chat_id into existing_chat
    from public.client_food_memory
   where chat_id=new.chat_id and normalized_name=n
   limit 1;

  if existing_chat is null then
    insert into public.client_food_memory(
      chat_id,normalized_name,display_name,use_count,
      avg_grams,avg_kcal,avg_prot,avg_fat,avg_carb,last_seen_at
    )
    values(
      new.chat_id,n,new.dish,1,
      new.grams,new.kcal,new.prot,new.fat,new.carb,now()
    );
  else
    update public.client_food_memory
       set display_name=new.dish,
           avg_grams=(coalesce(avg_grams,new.grams)*least(coalesce(use_count,1),19)+new.grams)/(least(coalesce(use_count,1),19)+1),
           avg_kcal=(coalesce(avg_kcal,new.kcal)*least(coalesce(use_count,1),19)+new.kcal)/(least(coalesce(use_count,1),19)+1),
           avg_prot=(coalesce(avg_prot,new.prot)*least(coalesce(use_count,1),19)+new.prot)/(least(coalesce(use_count,1),19)+1),
           avg_fat=(coalesce(avg_fat,new.fat)*least(coalesce(use_count,1),19)+new.fat)/(least(coalesce(use_count,1),19)+1),
           avg_carb=(coalesce(avg_carb,new.carb)*least(coalesce(use_count,1),19)+new.carb)/(least(coalesce(use_count,1),19)+1),
           use_count=coalesce(use_count,0)+1,
           last_seen_at=now()
     where chat_id=new.chat_id and normalized_name=n;
  end if;

  return new;
end $function$;
