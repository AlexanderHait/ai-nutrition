TeddY — обновление сайта

Добавлено:
1. Рассылки с фото: текст + изображение отправляются одним Telegram-сообщением.
2. Вкладка админки «n8n»: executions / AI / Vision / Web Search по клиентам и тарифам.
3. Назначение Basic / Premium и роли «Админ» отдельно для каждого клиента.
4. Пользователь, назначенный админом, после обычного Telegram-входа открывает /admin.
5. Добавлена production-таблица телеметрии ai_usage_events.

ВАЖНО ПЕРЕД/ВМЕСТЕ С ДЕПЛОЕМ:
- применить Supabase migration:
  supabase/migrations/017_admin_usage_mailing_media.sql
- добавить environment variable N8N_USAGE_SECRET в Vercel и тот же секрет использовать в n8n при POST на /api/bot/usage.

Сборка в текущем sandbox не была выполнена только потому, что внутренний npm registry не содержит @supabase/ssr.
Это ограничение среды проверки, а не обнаруженная ошибка проекта.
