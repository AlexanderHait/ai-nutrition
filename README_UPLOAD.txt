TeddY platform patch: Clients + Subscriptions

Загрузить в GitHub с сохранением путей:
- app/admin/clients/page.tsx
- app/admin/clients/[id]/page.tsx
- app/admin/subscriptions/page.tsx
- app/api/admin/subscription/route.ts
- components/AdminSubscriptionControl.tsx
- lib/data.ts
- app/globals.css

Не загружать .env, node_modules, .next.
После загрузки дождаться Vercel deploy и проверить:
1) /admin/clients — бейджи Basic/Premium/Admin, КБЖУ, активность.
2) /admin/clients/<telegram_id> — управление тарифом/админ-ролью, операционная сводка.
3) /admin/subscriptions — быстрые действия Basic/Premium/Без подписки.
