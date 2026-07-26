
-- 005_food_catalog.sql
-- Global exact-match food cache learned automatically from successfully saved meals.

create table if not exists food_catalog (
  id bigserial primary key,
  normalized_name text not null unique,
  display_name text not null,
  brand text,
  kcal_per_100 numeric(10,2) not null,
  prot_per_100 numeric(10,2) not null default 0,
  fat_per_100 numeric(10,2) not null default 0,
  carb_per_100 numeric(10,2) not null default 0,
  typical_grams numeric(10,1),
  source text not null default 'learned',
  use_count integer not null default 1,
  confidence numeric(5,4) not null default 0.80,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists food_catalog_last_seen_idx on food_catalog(last_seen_at desc);
create index if not exists food_catalog_use_count_idx on food_catalog(use_count desc);

create or replace function normalize_food_name(v text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(lower(coalesce(v,'')), '[^a-zа-яё0-9]+', ' ', 'gi'));
$$;

create or replace function learn_food_catalog_from_meal()
returns trigger
language plpgsql
security definer
as $$
declare
  n text;
  kp100 numeric;
  pp100 numeric;
  fp100 numeric;
  cp100 numeric;
begin
  if new.deleted is true or coalesce(new.grams,0) <= 0 or coalesce(new.kcal,0) <= 0 then
    return new;
  end if;

  n := normalize_food_name(new.dish);
  if length(n) < 3 then return new; end if;

  kp100 := new.kcal / new.grams * 100;
  pp100 := coalesce(new.prot,0) / new.grams * 100;
  fp100 := coalesce(new.fat,0) / new.grams * 100;
  cp100 := coalesce(new.carb,0) / new.grams * 100;

  -- Reject clearly broken rows from teaching the cache.
  if kp100 < 3 or kp100 > 1000 then return new; end if;

  insert into food_catalog(
    normalized_name,display_name,kcal_per_100,prot_per_100,fat_per_100,carb_per_100,
    typical_grams,source,use_count,confidence,last_seen_at,updated_at
  )
  values(
    n,new.dish,kp100,pp100,fp100,cp100,new.grams,'learned',1,0.80,now(),now()
  )
  on conflict(normalized_name) do update set
    display_name=excluded.display_name,
    kcal_per_100=(food_catalog.kcal_per_100*least(food_catalog.use_count,9)+excluded.kcal_per_100)/(least(food_catalog.use_count,9)+1),
    prot_per_100=(food_catalog.prot_per_100*least(food_catalog.use_count,9)+excluded.prot_per_100)/(least(food_catalog.use_count,9)+1),
    fat_per_100=(food_catalog.fat_per_100*least(food_catalog.use_count,9)+excluded.fat_per_100)/(least(food_catalog.use_count,9)+1),
    carb_per_100=(food_catalog.carb_per_100*least(food_catalog.use_count,9)+excluded.carb_per_100)/(least(food_catalog.use_count,9)+1),
    typical_grams=(coalesce(food_catalog.typical_grams,excluded.typical_grams)*least(food_catalog.use_count,9)+excluded.typical_grams)/(least(food_catalog.use_count,9)+1),
    use_count=food_catalog.use_count+1,
    confidence=least(0.98, food_catalog.confidence + 0.015),
    last_seen_at=now(),
    updated_at=now();

  return new;
end;
$$;

drop trigger if exists trg_learn_food_catalog on meals;
create trigger trg_learn_food_catalog
after insert on meals
for each row execute function learn_food_catalog_from_meal();

-- Batch exact lookup: one RPC call for an entire /v message.
create or replace function lookup_food_catalog(_queries jsonb)
returns table(
  idx integer,
  raw text,
  display_name text,
  kcal_per_100 numeric,
  prot_per_100 numeric,
  fat_per_100 numeric,
  carb_per_100 numeric,
  typical_grams numeric,
  confidence numeric,
  use_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select
      (x->>'idx')::integer as idx,
      x->>'raw' as raw,
      normalize_food_name(
        regexp_replace(
          regexp_replace(coalesce(x->>'raw',''), '\m\d+(?:[.,]\d+)?\s*(?:кг|kg|г|гр|g)\M', ' ', 'gi'),
          '\s+', ' ', 'g'
        )
      ) as norm
    from jsonb_array_elements(coalesce(_queries,'[]'::jsonb)) x
  )
  select q.idx,q.raw,f.display_name,f.kcal_per_100,f.prot_per_100,f.fat_per_100,f.carb_per_100,
         f.typical_grams,f.confidence,f.use_count
  from q
  join food_catalog f on f.normalized_name=q.norm
  where f.confidence >= 0.80;
$$;

grant execute on function lookup_food_catalog(jsonb) to anon, authenticated, service_role;
