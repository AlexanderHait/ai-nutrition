-- Текст ошибки провайдера.
--
-- В ai_usage_events у отказов лежал только обезличенный error_code
-- ('provider_error'), а настоящая причина была видна лишь внутри выполнения
-- n8n. Из-за этого AI-чат молчал 10 дней: по таблице выглядело, будто виноват
-- провайдер, хотя запрос до него вообще не доходил — «No prompt specified».
--
-- Узлы телеметрии причину вычисляли и выбрасывали: они читали error.code и
-- никогда error.message. Теперь читают оба, а у мотивации и у отказа зрения
-- кода ошибки не было вовсе — там он тоже появился.
alter table public.ai_usage_events
  add column if not exists error_message text;

comment on column public.ai_usage_events.error_message is
  'Текст ошибки от провайдера или узла, до 500 символов. Заполняется только при success = false.';

-- Отказы редки, а разбор всегда начинается с них — частичный индекс.
create index if not exists ai_usage_events_failures_idx
  on public.ai_usage_events (feature, created_at desc)
  where not success;
