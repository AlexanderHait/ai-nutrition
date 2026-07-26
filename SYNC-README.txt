AI-Nutrition — mobile redesign + website → bot sync

1. САЙТ
Залить проект целиком поверх текущего. Новый SQL не нужен.
Профиль клиента хранит:
- goal
- sex
- birth_date
- height_cm
- current_weight_kg
- target_weight_kg
- kcal_target
- protein_target
- fat_target
- carb_target

2. КАК РАБОТАЕТ СИНХРОНИЗАЦИЯ
Бот и сайт используют один Supabase.
После сохранения профиля сайт обновляет client_settings.
В workflow tx_text перед каждым AI-ответом читается client_settings + последнее измерение веса.
AI получает этот контекст в system prompt и сравнивает рацион с персональными целями.
В workflow digest профиль тоже читается перед ежедневным отчётом.

3. n8n
В папке n8n лежат:
- tx_text_synced.json
- digest_synced.json

Это версии на базе присланных workflow с добавленной синхронизацией.
ВНИМАНИЕ: чувствительные hard-coded токены в экспортированных JSON намеренно удалены.
Проще всего обновить текущие workflows вручную по аналогии или импортировать копии и заново выбрать существующие credentials в узлах, где n8n попросит.

Ключевые новые узлы:
tx_text:
User Log → GET client settings → GET latest weight → SUPA digest → ... → nutrion 2
nutrion 2 теперь использует client_settings и weight_logs.

digest:
groupByUser → GET client settings → digestGPT
digestGPT теперь оценивает день относительно персональных целей.

4. ПРОВЕРКА
- На сайте клиент меняет, например, цель калорий на 2300 и цель "Снижение веса".
- Затем пишет боту: "Как я сегодня питаюсь?"
- Ответ должен опираться на 2300 ккал и указанную цель.
- Следующий ежедневный digest также должен учитывать профиль.
