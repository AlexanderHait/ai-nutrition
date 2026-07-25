AI-Nutrition — подключение реальных данных

Замените/добавьте в существующем проекте:
1. lib/supabase-admin.ts
2. app/admin/clients/page.tsx
3. app/admin/page.tsx

ВАЖНО:
В package.json должна быть зависимость:
"@supabase/supabase-js": "^2.0.0"

В Vercel должны существовать:
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

После commit GitHub Vercel автоматически сделает новый deploy.
Проверочная страница: /admin/clients

Эта версия только ЧИТАЕТ profiles и meals.
Она ничего не удаляет и не изменяет в базе.
Удалённые meals (deleted=true) не учитываются.
