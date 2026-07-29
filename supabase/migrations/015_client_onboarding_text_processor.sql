create or replace function public.process_client_onboarding_text(_chat_id bigint,_text text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.client_onboarding_sessions%rowtype; txt text:=lower(coalesce(_text,'')); age_i int; h numeric; w numeric; sex_t text; goal_t text; act_t text; m text[]; t jsonb;
begin
 select * into s from public.client_onboarding_sessions where chat_id=_chat_id;
 if not found or s.status<>'pending' then return jsonb_build_object('handled',false); end if;
 m:=regexp_match(txt,'([0-9]{2})\s*(лет|год|года)'); if m is not null then age_i:=m[1]::int; end if;
 m:=regexp_match(txt,'([0-9]{3}(?:[\.,][0-9]+)?)\s*(см|cm)'); if m is not null then h:=replace(m[1],',','.')::numeric; end if;
 m:=regexp_match(txt,'([0-9]{2,3}(?:[\.,][0-9]+)?)\s*(кг|kg)'); if m is not null then w:=replace(m[1],',','.')::numeric; end if;
 if txt~'(мужчина|\bмуж\b|\bmale\b)' then sex_t:='male'; elsif txt~'(женщина|\bжен\b|\bfemale\b)' then sex_t:='female'; end if;
 if txt~'(похуд|снижен|дефицит)' then goal_t:='loss'; elsif txt~'(набор|набрат|масса)' then goal_t:='gain'; elsif txt~'(поддерж|сохран)' then goal_t:='maintain'; end if;
 if txt~'(очень высокая|очень высокий)' then act_t:='very_high'; elsif txt~'(высокая|высокий)' then act_t:='high'; elsif txt~'(средняя|средний|умеренная)' then act_t:='moderate'; elsif txt~'(легкая|лёгкая|легкий|лёгкий)' then act_t:='light'; elsif txt~'(низкая|низкий|сидяч)' then act_t:='low'; end if;
 if age_i is null or h is null or w is null or sex_t is null or goal_t is null or act_t is null then return jsonb_build_object('handled',true,'complete',false,'message','Не все данные распознаны. Пришли одной строкой: Мужчина, 24 года, 176 см, 69 кг, цель — набор, активность — высокая.'); end if;
 t:=public.complete_client_onboarding(_chat_id,sex_t,age_i,h,w,goal_t,act_t);
 return jsonb_build_object('handled',true,'complete',true,'targets',t);
end $$;
grant execute on function public.process_client_onboarding_text(bigint,text) to service_role;
