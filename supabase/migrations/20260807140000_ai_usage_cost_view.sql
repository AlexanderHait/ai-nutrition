-- Стоимость вызовов AI.
--
-- Зачем: в `ai_usage_events` у всех настоящих вызовов стояли нули по токенам и цене,
-- потому что узел зрения n8n не возвращает usage, а телеметрия собирала только модель,
-- успех и задержку. Себестоимость подписчика измерить было нечем.
--
-- Токены берём измеренные, а при их отсутствии — оценку по длине (её пишет n8n).
-- Флаг tokens_estimated показывает, что именно перед вами, pricing_missing — что
-- у модели нет тарифа в `ai_model_pricing`.

create or replace view public.ai_usage_cost_v1
with (security_invoker = on) as
select
  e.id,
  e.created_at,
  e.chat_id,
  e.feature,
  e.model,
  e.success,
  coalesce(nullif(e.input_tokens, 0),  e.estimated_input_tokens,  0) as in_tokens,
  coalesce(nullif(e.output_tokens, 0), e.estimated_output_tokens, 0) as out_tokens,
  (coalesce(nullif(e.input_tokens, 0), 0) = 0) as tokens_estimated,
  p.input_usd_per_million,
  p.output_usd_per_million,
  round((
      coalesce(nullif(e.input_tokens, 0),  e.estimated_input_tokens,  0)::numeric * coalesce(p.input_usd_per_million, 0)
    + coalesce(nullif(e.output_tokens, 0), e.estimated_output_tokens, 0)::numeric * coalesce(p.output_usd_per_million, 0)
  ) / 1000000, 6) as cost_usd,
  (p.model is null) as pricing_missing
from public.ai_usage_events e
left join public.ai_model_pricing p
  on p.model = e.model
 and p.is_active
 and e.created_at >= p.effective_from
 and (p.effective_until is null or e.created_at < p.effective_until);

revoke all on public.ai_usage_cost_v1 from public, anon, authenticated;

-- Себестоимость по клиенту за месяц:
--   select chat_id, round(sum(cost_usd),4) usd from ai_usage_cost_v1
--   where created_at >= date_trunc('month', now()) group by chat_id order by 2 desc;
