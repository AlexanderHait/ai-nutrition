alter table public.client_settings add column if not exists age_years integer;
alter table public.client_settings add column if not exists activity_level text;
alter table public.client_settings add column if not exists onboarding_source text;

create table if not exists public.client_onboarding_sessions(
  chat_id bigint primary key,
  status text not null default 'pending' check(status in ('pending','complete','cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.nutrition_targets_v1(_sex text,_age integer,_height_cm numeric,_weight_kg numeric,_goal text,_activity text)
returns jsonb language plpgsql immutable as $$
declare sex_n text:=lower(trim(coalesce(_sex,''))); goal_n text:=lower(trim(coalesce(_goal,''))); act_n text:=lower(trim(coalesce(_activity,''))); bmr numeric; af numeric; goal_factor numeric; kcal integer; protein integer; fat integer; carb integer;
begin
 if _age<14 or _age>100 then raise exception 'age_out_of_range'; end if;
 if _height_cm<120 or _height_cm>230 then raise exception 'height_out_of_range'; end if;
 if _weight_kg<35 or _weight_kg>300 then raise exception 'weight_out_of_range'; end if;
 if sex_n in ('м','муж','мужчина','male','m') then sex_n:='male'; bmr:=10*_weight_kg+6.25*_height_cm-5*_age+5;
 elsif sex_n in ('ж','жен','женщина','female','f') then sex_n:='female'; bmr:=10*_weight_kg+6.25*_height_cm-5*_age-161;
 else raise exception 'sex_required'; end if;
 if act_n in ('низкая','низкий','сидячая','sedentary','low') then af:=1.2; act_n:='low';
 elsif act_n in ('легкая','лёгкая','light') then af:=1.375; act_n:='light';
 elsif act_n in ('средняя','средний','умеренная','moderate','medium') then af:=1.55; act_n:='moderate';
 elsif act_n in ('высокая','высокий','high') then af:=1.725; act_n:='high';
 elsif act_n in ('очень высокая','очень высокий','very_high','very high') then af:=1.9; act_n:='very_high';
 else raise exception 'activity_required'; end if;
 if goal_n~'(похуд|снижен|дефицит|loss|lose)' then goal_n:='loss'; goal_factor:=0.85;
 elsif goal_n~'(набор|набрат|масса|gain)' then goal_n:='gain'; goal_factor:=1.10;
 elsif goal_n~'(поддерж|сохран|maintain)' then goal_n:='maintain'; goal_factor:=1.00;
 else raise exception 'goal_required'; end if;
 kcal:=round((bmr*af*goal_factor)/10.0)*10;
 protein:=round(_weight_kg*case when goal_n='maintain' then 1.6 else 1.8 end);
 fat:=round(_weight_kg*0.9);
 carb:=greatest(0,round((kcal-protein*4-fat*9)/4.0));
 return jsonb_build_object('method','Mifflin-St Jeor','sex',sex_n,'age',_age,'height_cm',_height_cm,'weight_kg',_weight_kg,'activity_level',act_n,'goal',goal_n,'bmr',round(bmr),'kcal_target',kcal,'protein_target',protein,'fat_target',fat,'carb_target',carb);
end $$;

create or replace function public.complete_client_onboarding(_chat_id bigint,_sex text,_age integer,_height_cm numeric,_weight_kg numeric,_goal text,_activity text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t jsonb; goal_label text;
begin
 t:=public.nutrition_targets_v1(_sex,_age,_height_cm,_weight_kg,_goal,_activity);
 goal_label:=case t->>'goal' when 'loss' then 'Снижение веса' when 'gain' then 'Набор массы' else 'Поддержание веса' end;
 insert into public.client_settings(chat_id,goal,sex,age_years,height_cm,current_weight_kg,kcal_target,protein_target,fat_target,carb_target,activity_level,onboarding_source,updated_at)
 values(_chat_id,goal_label,t->>'sex',_age,_height_cm,_weight_kg,(t->>'kcal_target')::numeric,(t->>'protein_target')::numeric,(t->>'fat_target')::numeric,(t->>'carb_target')::numeric,t->>'activity_level','telegram_start',now())
 on conflict(chat_id) do update set goal=excluded.goal,sex=excluded.sex,age_years=excluded.age_years,height_cm=excluded.height_cm,current_weight_kg=excluded.current_weight_kg,kcal_target=excluded.kcal_target,protein_target=excluded.protein_target,fat_target=excluded.fat_target,carb_target=excluded.carb_target,activity_level=excluded.activity_level,onboarding_source='telegram_start',updated_at=now();
 insert into public.weight_logs(chat_id,weight_kg,measured_at) select _chat_id,_weight_kg,now() where not exists(select 1 from public.weight_logs w where w.chat_id=_chat_id and abs(w.weight_kg-_weight_kg)<0.01 and w.measured_at>now()-interval '1 hour');
 insert into public.client_onboarding_sessions(chat_id,status,started_at,completed_at,updated_at) values(_chat_id,'complete',now(),now(),now()) on conflict(chat_id) do update set status='complete',completed_at=now(),updated_at=now();
 return t;
end $$;

grant execute on function public.nutrition_targets_v1(text,integer,numeric,numeric,text,text) to service_role;
grant execute on function public.complete_client_onboarding(bigint,text,integer,numeric,numeric,text,text) to service_role;
