-- Тарифы моделей, которых не хватало в прайс-листе — 10.08.2026
--
-- В `ai_usage_events` использовались три модели без цены: gpt-5.4 (AI-чат и
-- Premium Coach) и gpt-4.1-mini (разбор блюд в фото-пути). Их вызовы считались
-- как ноль, то есть себестоимость подписчика была занижена.
--
-- Цены взяты у самого провайдера (публичный список моделей OpenRouter,
-- проверено 10.08.2026), а не по памяти. Единицы — USD за миллион токенов.

insert into public.ai_model_pricing
  (provider, model, input_usd_per_million, output_usd_per_million, effective_from, is_active)
values
  ('openrouter', 'openai/gpt-5.4',      2.50, 15.00, now(), true),
  ('openrouter', 'openai/gpt-4.1-mini', 0.40,  1.60, now(), true)
on conflict do nothing;
