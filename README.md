# AI-Nutrition — deployable web application

Это Next.js-проект, а не одиночный HTML. Есть отдельные маршруты админа и клиента, SQL-схема Supabase и endpoint для приёма КБЖУ от Telegram-бота.

## Рекомендуемый production
- Frontend/backend: Next.js
- Hosting: Vercel
- Database/Auth: Supabase (PostgreSQL + Auth + RLS)
- Existing Telegram bot: отправляет готовый результат в `/api/bot/meal`
- Custom domain: например `app.ai-nutrition.ru`

## Запуск локально
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Подключение базы
Создать Supabase project и выполнить `supabase/migrations/001_schema.sql`.

## Переменные
Заполнить `.env.local` значениями из Supabase и длинным случайным `BOT_INGEST_SECRET`.

## Интеграция с ботом
POST `https://YOUR-DOMAIN/api/bot/meal`
Header: `Authorization: Bearer <BOT_INGEST_SECRET>`

Пример:
```json
{"telegram_user_id":584239102,"meal_name":"Куриный салат","portion_grams":320,"calories":486,"protein_g":42,"fat_g":20,"carbs_g":28,"ai_confidence":0.96}
```

## Публикация
1. Создать приватный GitHub repository.
2. Загрузить проект.
3. Import repository в Vercel.
4. Добавить environment variables.
5. Подключить домен.
6. Ветка `main` — production.

## Важно
Интерфейс сейчас заполнен демонстрационными данными, чтобы все страницы были видны сразу. Схема БД и ingest endpoint готовы; следующим техническим этапом данные экранов переключаются с моков на Supabase-запросы и подключается реальный Auth.
