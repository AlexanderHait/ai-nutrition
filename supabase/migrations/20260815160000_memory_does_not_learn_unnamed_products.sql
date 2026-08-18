-- Личная память не учится на товаре, который бот не смог назвать.
--
-- Три черновика (518, 526, 527) показали пользователю «Неидентифицированный
-- продукт», «Неопознанный продукт (в упаковке с составом и пищевой ценностью)»
-- и «Продукт на основе растительных масел (упаковка фиолетового цвета)».
-- Все три удалены, то есть отмена стопроцентная. Но если бы такую сводку
-- сохранили, триггер запомнил бы заглушку как привычное блюдо — и со второго
-- раза ветка Apply Portion Memory начала бы подставлять её вес другим товарам.
--
-- Это то же правило, что уже стоит на заголовках приёма пищи («Обед:»),
-- на названии без единой буквы и на невозможной плотности: последний рубеж
-- перед тем, как ошибка станет привычкой.
--
-- Тот же список признаков продублирован в узле `Build batch summary`
-- (`2z8MgeEZ8kt4MeBg`), где он ставит позиции пометку «⚠️ проверь» и просьбу
-- сфотографировать штрих-код. Меняя один список, проверь второй.
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

  -- Заглушка вместо названия: запомнить её значит превратить «не знаю»
  -- в привычку, которая потом будет подставляться другим товарам.
  if coalesce(new.dish,'') ~* '(неопознан|неидентифицир|не опознан|неизвестн[а-яё]*\s+(продукт|товар|блюдо)|не удалось\s+(определить|опознать|распознать)|без названия|unidentified|unknown product|продукт на основе|в упаковке с составом|упаковк[а-яё]*\s+[а-яё]+\s+цвета)' then
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
