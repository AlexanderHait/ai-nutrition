# AI‑Nutrition Portal

Рабочая версия сайта поверх существующей базы Telegram‑бота.

## Что уже работает
- Админка на реальных `profiles`, `meals`, `chat_logs`, `digests`.
- Карточка клиента, КБЖУ за день, приёмы пищи, диалоги и AI‑дайджесты.
- Аналитика активности.
- Клиентский кабинет с Telegram Login.
- История питания, прогресс, профиль.
- Структура подписок/платежей подготовлена, но платёжный провайдер пока не подключён.
- Фото еды не сохраняются и не показываются порталом.

## 1. Supabase
В SQL Editor выполнить только:

`supabase/migrations/002_portal.sql`

Миграция добавляет новые таблицы и не меняет рабочие таблицы бота.

## 2. Vercel Environment Variables
Добавить значения из `.env.example`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET` — длинная случайная строка
- `ADMIN_PASSWORD` — пароль входа владельца
- `TELEGRAM_BOT_TOKEN` — токен текущего Telegram‑бота (server-only)
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — username бота без @
- `NEXT_PUBLIC_SITE_URL=https://smartnutrition-ai.ru`

После изменения переменных сделать Redeploy.

## 3. Telegram Login
В BotFather для бота должен быть разрешён домен `smartnutrition-ai.ru` для Telegram Login. После этого на `/login` появится вход клиента через Telegram.

## 4. Вход
- `/login` — клиент через Telegram или администратор по `ADMIN_PASSWORD`.
- `/admin` — админка.
- `/client` — кабинет клиента.

## Безопасность
`SUPABASE_SERVICE_ROLE_KEY` используется только на сервере. Никогда не добавлять его как `NEXT_PUBLIC_*`.

Перед публичным запуском перевыпустить ранее засвеченные Telegram/Supabase секреты и обновить их в n8n/Vercel.
