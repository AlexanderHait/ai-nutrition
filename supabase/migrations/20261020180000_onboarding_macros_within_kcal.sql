-- Цели по анкете в боте: БЖУ не должны быть больше нормы калорий.
--
-- nutrition_targets_v1 считает цели, когда человек проходит анкету в Telegram
-- (process_client_onboarding_text → complete_client_onboarding). Белок и жир
-- брались от полного веса, а углеводы обрезались нулём: при ИМТ 40 белок и жир
-- одни давали больше калорий, чем вся норма.
--
-- Теперь правило то же, что у анкеты на сайте (calculateNutritionTargets в
-- lib/client-setup.ts), — менять только вместе:
--   * белок и жир — от веса, но не больше веса при ИМТ 27;
--   * углеводы — остаток, не меньше 80 г; если места нет, жир снижается до
--     0,6 г/кг, а углеводы берут остаток;
--   * калории не ниже 1500 (м) / 1200 (ж) и не выше 6000, белок на наборе
--     1,7 г/кг, жир 0,8 г/кг — как на сайте (раньше в боте не было предела
--     калорий, белок на наборе был 1,8, жир 0,9).
--
-- Уже сохранённые цели (client_settings) не пересчитываются: функция работает
-- только при прохождении анкеты.

create or replace function public.nutrition_targets_v1(_sex text,_age integer,_height_cm numeric,_weight_kg numeric,_goal text,_activity text)
returns jsonb language plpgsql immutable as $$
declare sex_n text:=lower(trim(coalesce(_sex,''))); goal_n text:=lower(trim(coalesce(_goal,''))); act_n text:=lower(trim(coalesce(_activity,''))); bmr numeric; af numeric; goal_factor numeric; protein_factor numeric; ref_kg numeric; kcal integer; protein integer; fat integer; carb integer;
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
 if goal_n~'(похуд|снижен|дефицит|loss|lose)' then goal_n:='loss'; goal_factor:=0.85; protein_factor:=1.8;
 elsif goal_n~'(набор|набрат|масса|gain)' then goal_n:='gain'; goal_factor:=1.10; protein_factor:=1.7;
 elsif goal_n~'(поддерж|сохран|maintain)' then goal_n:='maintain'; goal_factor:=1.00; protein_factor:=1.6;
 else raise exception 'goal_required'; end if;
 kcal:=round(least(6000,greatest(case when sex_n='male' then 1500 else 1200 end,bmr*af*goal_factor))/10.0)*10;
 ref_kg:=least(_weight_kg,27*(_height_cm/100.0)*(_height_cm/100.0));
 protein:=round(ref_kg*protein_factor);
 fat:=round(ref_kg*0.8);
 carb:=greatest(80,round((kcal-protein*4-fat*9)/4.0));
 if protein*4+fat*9+carb*4>kcal+5 then
  fat:=greatest(round(ref_kg*0.6),floor((kcal-protein*4-80*4)/9.0));
  carb:=greatest(0,round((kcal-protein*4-fat*9)/4.0));
 end if;
 return jsonb_build_object('method','Mifflin-St Jeor','sex',sex_n,'age',_age,'height_cm',_height_cm,'weight_kg',_weight_kg,'activity_level',act_n,'goal',goal_n,'bmr',round(bmr),'kcal_target',kcal,'protein_target',protein,'fat_target',fat,'carb_target',carb);
end $$;

-- Б-05: напрямую функцию вызывает только service_role; complete_client_onboarding
-- (security definer) вызывает её от имени владельца.
revoke execute on function public.nutrition_targets_v1(text,integer,numeric,numeric,text,text) from public, anon, authenticated;
grant execute on function public.nutrition_targets_v1(text,integer,numeric,numeric,text,text) to service_role;
