# TeddY — управление подпиской из админки

В архиве:
- components/AdminSubscriptionControl.tsx
- app/api/admin/subscription/route.ts
- lib/subscription-plan.ts

Кнопки:
- Без подписки
- Basic
- Premium

Пример использования:

```tsx
<AdminSubscriptionControl
  chatId={client.chat_id}
  currentPlan={normalizeSubscriptionPlan(client.subscription_lifecycle?.plan)}
/>
```

Поведение:
- Basic/Premium -> upsert в `subscription_lifecycle`, `state = active`.
- Без подписки -> удаление строки клиента из `subscription_lifecycle`.

ВАЖНО:
В `route.ts` функция `assertAdmin()` оставлена как точка подключения к уже существующей
авторизации админки. Не оставляй ее без проверки при выкладке в production.

`SUPABASE_SERVICE_ROLE_KEY` должна использоваться только на сервере.

Поскольку исходники сайта пока не загружены в этот чат, пакет сделан без привязки
к конкретному пути страницы клиентов и вашему UI-kit. После загрузки репозитория
его можно встроить один-в-один в текущую карточку клиента.

Production: unified accounts, Premium checkout and 3-day trial.
