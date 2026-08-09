-- Дневник запоминает, откуда взялись числа — 09.08.2026
--
-- Бот научился отличать источник от догадки и честно помечает это в сводке.
-- Но при сохранении вся эта работа выбрасывалась: в `meals` попадали только
-- блюдо, граммы и КБЖУ. Последствия:
--
--   * сайт не может отличить проверенную запись от выдуманной и пересчитывает
--     «качество» по одной арифметике — правдоподобная выдумка выглядит нормой;
--   * нельзя измерить, какая доля дневника держится на догадках;
--   * пометка «⚠️ проверь» живёт ровно до нажатия «Сохранить».
--
-- Все три пути (фото, /v, /day) сохраняются через одну функцию
-- `commit_meal_draft_v20`, поэтому правка нужна в одном месте.

alter table public.meals
  add column if not exists nutrition_source text,
  add column if not exists weight_source text,
  add column if not exists needs_check boolean not null default false;

comment on column public.meals.nutrition_source is
  'Откуда взяты КБЖУ: verified_catalog, official_catalog, label, barcode, estimate и т. п.';
comment on column public.meals.weight_source is
  'Откуда взят вес: catalog_portion, package_printed, user_confirmed, unknown_visual_estimate и т. п.';
comment on column public.meals.needs_check is
  'Бот показывал эту позицию с пометкой «проверь» в момент сохранения.';

create or replace function public.commit_meal_draft_v20(_chat_id bigint, _message_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.meals_draft%rowtype;
  candidates_v jsonb;
  item jsonb;
  meal_ids bigint[] := array[]::bigint[];
  new_meal_id bigint;
  saved_count integer := 0;
  total_kcal numeric := 0;
  total_prot numeric := 0;
  total_fat numeric := 0;
  total_carb numeric := 0;
  dish_v text;
  grams_v numeric;
  kcal_v numeric;
  prot_v numeric;
  fat_v numeric;
  carb_v numeric;
  eaten_at_v timestamptz;
  key_v text;
  corrected boolean;
  nutrition_source_v text;
  weight_source_v text;
  needs_check_v boolean;
begin
  if _chat_id is null or _message_id is null then
    raise exception 'chat_id and message_id are required';
  end if;

  perform pg_advisory_xact_lock(hashtext('meal-draft-commit:' || _chat_id::text || ':' || _message_id::text));

  select * into d
  from public.meals_draft
  where chat_id = _chat_id and message_id = _message_id
  order by id desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'not_found', 'inserted', 0);
  end if;

  if d.status in ('saved','cancelled') then
    return jsonb_build_object('ok', true, 'status', d.status, 'already_finalized', true, 'inserted', 0);
  end if;

  if d.status <> 'await_multi_confirm' then
    return jsonb_build_object('ok', false, 'status', d.status, 'busy_or_invalid_state', true, 'inserted', 0);
  end if;

  candidates_v := d.candidates;

  if candidates_v is null then
    raise exception 'draft candidates are missing';
  end if;

  if jsonb_typeof(candidates_v) = 'string' then
    begin
      candidates_v := (candidates_v #>> '{}')::jsonb;
    exception when others then
      raise exception 'draft candidates string is not valid JSON';
    end;
  end if;

  if jsonb_typeof(candidates_v) <> 'array' then
    raise exception 'draft candidates must be a JSON array';
  end if;

  update public.meals_draft
  set status = 'saving', updated_at = now()
  where id = d.id;

  for item in select value from jsonb_array_elements(candidates_v)
  loop
    if coalesce((item->>'included')::boolean, true) is false then
      continue;
    end if;

    dish_v := btrim(coalesce(item->>'dish',''));
    grams_v := nullif(item->>'grams','')::numeric;
    kcal_v := nullif(item->>'kcal','')::numeric;
    prot_v := coalesce(nullif(item->>'prot','')::numeric,0);
    fat_v := coalesce(nullif(item->>'fat','')::numeric,0);
    carb_v := coalesce(nullif(item->>'carb','')::numeric,0);

    if dish_v = '' or coalesce(grams_v,0) <= 0 or coalesce(kcal_v,0) <= 0 then
      raise exception 'invalid included meal candidate in draft %', d.id;
    end if;

    begin
      eaten_at_v := nullif(item->>'eaten_at','')::timestamptz;
    exception when others then
      eaten_at_v := null;
    end;
    eaten_at_v := coalesce(eaten_at_v, now());

    -- Происхождение чисел. Текстовый путь называет пометку `check`, фото —
    -- `needs_check`/`uncertain`; принимаем любую, иначе честность теряется
    -- ровно на том пути, где её и не хватало.
    nutrition_source_v := nullif(btrim(coalesce(item->>'nutrition_source','')),'');
    weight_source_v := nullif(btrim(coalesce(item->>'weight_source','')),'');
    begin
      needs_check_v := coalesce(
        (item->>'needs_check')::boolean,
        (item->>'uncertain')::boolean,
        (item->>'check')::boolean,
        false
      );
    exception when others then
      needs_check_v := false;
    end;

    insert into public.meals(
      chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,
      nutrition_source,weight_source,needs_check
    )
    values(
      _chat_id,dish_v,grams_v,kcal_v,prot_v,fat_v,carb_v,eaten_at_v,
      nutrition_source_v,weight_source_v,needs_check_v
    )
    returning id into new_meal_id;

    meal_ids := array_append(meal_ids,new_meal_id);
    saved_count := saved_count + 1;
    total_kcal := total_kcal + kcal_v;
    total_prot := total_prot + prot_v;
    total_fat := total_fat + fat_v;
    total_carb := total_carb + carb_v;

    corrected := coalesce((item->>'user_corrected')::boolean,false);

    if corrected then
      key_v := public.normalize_food_name(dish_v);
      if length(key_v) >= 2 then
        insert into public.client_food_overrides(
          chat_id,normalized_key,display_name,brand,grams,kcal,prot,fat,carb,confidence,source,use_count,updated_at
        )
        values(
          _chat_id,key_v,dish_v,nullif(item->>'brand',''),grams_v,kcal_v,prot_v,fat_v,carb_v,.98,'client_correction',1,now()
        )
        on conflict(chat_id,normalized_key) do update
        set display_name = excluded.display_name,
            brand = coalesce(excluded.brand,public.client_food_overrides.brand),
            grams = excluded.grams,
            kcal = excluded.kcal,
            prot = excluded.prot,
            fat = excluded.fat,
            carb = excluded.carb,
            confidence = greatest(public.client_food_overrides.confidence,excluded.confidence),
            source = 'client_correction',
            use_count = public.client_food_overrides.use_count + 1,
            updated_at = now();

        insert into public.correction_events(chat_id,meal_id,field,before_value,after_value,source)
        values(
          _chat_id,new_meal_id,'photo_confirmation',null,
          jsonb_build_object('dish',dish_v,'grams',grams_v,'kcal',kcal_v,'prot',prot_v,'fat',fat_v,'carb',carb_v)::text,
          'client'
        );
      end if;
    end if;
  end loop;

  if saved_count = 0 then
    update public.meals_draft set status='cancelled',updated_at=now() where id=d.id;
    return jsonb_build_object('ok',true,'status','cancelled','already_finalized',false,'inserted',0);
  end if;

  update public.meals_draft set status='saved',updated_at=now() where id=d.id;

  return jsonb_build_object(
    'ok',true,
    'status','saved',
    'already_finalized',false,
    'inserted',saved_count,
    'meal_ids',to_jsonb(meal_ids),
    'kcal',round(total_kcal),
    'prot',round(total_prot,1),
    'fat',round(total_fat,1),
    'carb',round(total_carb,1)
  );
end $$;
