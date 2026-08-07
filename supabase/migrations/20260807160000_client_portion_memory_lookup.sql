-- Личная память о порциях.
--
-- Таблица `client_food_memory` заполнялась с самого начала (74 записи с реальными
-- весами: «Банан» 140 г ×4, «Малый картофель фри» 67.5 г ×4), но при распознавании
-- НЕ ИСПОЛЬЗОВАЛАСЬ ВООБЩЕ — вес тарелки всегда оценивался на глаз, хотя свои же
-- прошлые приёмы это самый надёжный источник веса, какой вообще есть.
--
-- Правило намеренно строгое: совпадение только по нормализованному имени,
-- привычкой считается блюдо, съеденное не меньше двух раз, вес в разумных пределах.
create or replace function public.lookup_client_portion_memory(_chat_id bigint, _queries jsonb)
returns table(idx integer, raw text, display_name text, avg_grams numeric, use_count integer)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with q as (
    select
      coalesce((x->>'idx')::integer, ordinality::integer - 1) as idx,
      x->>'raw' as raw,
      translate(lower(regexp_replace(coalesce(x->>'raw',''), '[^a-zA-Zа-яА-ЯёЁ0-9]+', ' ', 'g')), 'ё', 'е') as norm
    from jsonb_array_elements(coalesce(_queries, '[]'::jsonb)) with ordinality as e(x, ordinality)
  ),
  qq as (select q.*, regexp_replace(btrim(q.norm), '\s+', ' ', 'g') as nq from q),
  m as (
    select c.display_name, c.avg_grams, c.use_count,
           regexp_replace(btrim(translate(lower(regexp_replace(c.normalized_name, '[^a-zA-Zа-яА-ЯёЁ0-9]+', ' ', 'g')), 'ё', 'е')), '\s+', ' ', 'g') as nm
    from public.client_food_memory c
    where c.chat_id = _chat_id
      and c.use_count >= 2
      and c.avg_grams between 5 and 2000
  ),
  best as (
    select qq.idx, qq.raw, m.display_name, m.avg_grams, m.use_count,
           row_number() over (partition by qq.idx order by m.use_count desc, m.avg_grams) rn
    from qq join m on m.nm = qq.nq
    where length(qq.nq) >= 3
  )
  select b.idx, b.raw, b.display_name, round(b.avg_grams) as avg_grams, b.use_count
  from best b where b.rn = 1;
$$;

revoke execute on function public.lookup_client_portion_memory(bigint, jsonb) from public, anon, authenticated;
