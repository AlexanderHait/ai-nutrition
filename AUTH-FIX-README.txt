КРИТИЧЕСКИЙ ФИКС AUTH

Этот архив собран непосредственно поверх загруженного пользователем ai-nutrition-main (2).zip.
В исходнике были найдены две точные причины:
1) components/TelegramLogin.tsx всё ещё загружал telegram-widget.js (legacy) => oauth.telegram.org/auth?bot_id=... => deprecated.
2) Shell использует GET /api/auth/logout, но route принимал только POST и удалял неправильные cookie. Реальная cookie называется ain_session.

Исправлено:
- TelegramLogin теперь обычная кнопка на /api/auth/telegram.
- /api/auth/telegram генерирует OIDC Authorization Code Flow + PKCE (client_id, code_challenge).
- добавлен /api/auth/telegram/callback: token exchange, JWKS verification, проверка существования пользователя в profiles, создание ain_session.
- logout принимает GET и POST и удаляет именно ain_session.
- добавлен jose в package.json.

Vercel env:
TELEGRAM_CLIENT_ID=8902031881
TELEGRAM_CLIENT_SECRET=<секрет из BotFather>
NEXT_PUBLIC_SITE_URL=https://www.smartnutrition-ai.ru
SESSION_SECRET=<существующий секрет>

BotFather Web Login:
Redirect URI: https://www.smartnutrition-ai.ru/api/auth/telegram/callback
Trusted Origin: https://www.smartnutrition-ai.ru

ПОСЛЕ ЗАЛИВКИ ОБЯЗАТЕЛЬНО НОВЫЙ PRODUCTION DEPLOYMENT.
ПРОВЕРКА: /api/auth/telegram должен открыть URL с ?client_id=..., НЕ ?bot_id=...
