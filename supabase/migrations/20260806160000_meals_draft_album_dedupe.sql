-- Альбом в Telegram приходит отдельными сообщениями с общим media_group_id.
-- Два фото одной бутылки давали две сводки, и сохранение обеих считало товар дважды.
-- Признак альбома уже доходит до workflow фото — ингресс передаёт весь апдейт,
-- поэтому правок в ингрессе не потребовалось.

alter table public.meals_draft add column if not exists media_group_id text;

create index if not exists meals_draft_album_idx
  on public.meals_draft (chat_id, media_group_id)
  where media_group_id is not null;

-- После сохранения приёма пищи гасим соседние черновики того же альбома,
-- если это те же самые товары. Правило намеренно строгое: отменяется только
-- черновик, КАЖДАЯ позиция которого совпадает с позицией сохранённого
-- (по штрих-коду, по id каталога или по точному названию).
-- Альбом из разных блюд не затрагивается.
create or replace function public.cancel_album_duplicate_drafts(_chat_id bigint, _message_id bigint)
returns table(cancelled_count int, cancelled_ids bigint[])
language plpgsql
security definer
set search_path = public
as $$
declare
  _saved public.meals_draft;
  _ids bigint[] := '{}';
begin
  select * into _saved
  from public.meals_draft
  where chat_id = _chat_id and message_id = _message_id
  order by id desc limit 1;

  if _saved.id is null or _saved.media_group_id is null then
    return query select 0, '{}'::bigint[]; return;
  end if;

  with saved_items as (
    select
      nullif(c->>'barcode','') as barcode,
      nullif(c->>'catalog_id','') as catalog_id,
      lower(regexp_replace(translate(coalesce(c->>'display_name', c->>'dish',''),'ё','е'), '\s+', ' ', 'g')) as nm
    from jsonb_array_elements(
      case when jsonb_typeof(_saved.candidates) = 'array' then _saved.candidates else '[]'::jsonb end) c
  ),
  siblings as (
    select d.id, d.candidates
    from public.meals_draft d
    where d.chat_id = _chat_id
      and d.media_group_id = _saved.media_group_id
      and d.id <> _saved.id
      and d.status = 'await_multi_confirm'
      and d.created_at > now() - interval '2 hours'
  ),
  sib_items as (
    select s.id,
      nullif(c->>'barcode','') as barcode,
      nullif(c->>'catalog_id','') as catalog_id,
      lower(regexp_replace(translate(coalesce(c->>'display_name', c->>'dish',''),'ё','е'), '\s+', ' ', 'g')) as nm
    from siblings s
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(s.candidates) = 'array' then s.candidates else '[]'::jsonb end) c
  ),
  matched as (
    select si.id,
           count(*) as total,
           count(*) filter (where exists (
             select 1 from saved_items sv
             where (si.barcode is not null and sv.barcode = si.barcode)
                or (si.catalog_id is not null and sv.catalog_id = si.catalog_id)
                or (length(coalesce(si.nm,'')) >= 3 and sv.nm = si.nm)
           )) as same
    from sib_items si
    group by si.id
  )
  select coalesce(array_agg(m.id), '{}') into _ids
  from matched m
  where m.total > 0 and m.total = m.same;

  if array_length(_ids, 1) is null then
    return query select 0, '{}'::bigint[]; return;
  end if;

  update public.meals_draft
  set status = 'cancelled', updated_at = now()
  where id = any(_ids);

  return query select array_length(_ids, 1), _ids;
end $$;

revoke execute on function public.cancel_album_duplicate_drafts(bigint, bigint) from public, anon, authenticated;
