AI-Nutrition: Telegram OIDC + Logout fix

Причина текущих ошибок:
1) В текущем проекте используется старый Telegram Login Widget. Он открывает oauth.telegram.org/auth с параметром bot_id, поэтому Telegram отвечает "deprecated".
2) Shell открывает /api/auth/logout GET-ссылкой, а текущий route принимает только POST.
3) Старый logout удаляет неправильные имена cookie, а реальная cookie проекта называется ain_session.

Что исправлено:
- Telegram Widget полностью убран.
- Кнопка "Войти через Telegram" ведёт на /api/auth/telegram.
- /api/auth/telegram запускает стандартный OIDC Authorization Code Flow + PKCE и использует client_id.
- callback обменивает code на token, проверяет ID Token по Telegram JWKS и создаёт клиентскую сессию.
- Logout работает и через POST, и через GET, удаляет реальную ain_session.
- Боковая кнопка "Выйти" теперь отправляет POST.

Vercel Environment Variables:
TELEGRAM_CLIENT_ID=8902031881
TELEGRAM_CLIENT_SECRET=<секрет из BotFather, не публиковать>
NEXT_PUBLIC_SITE_URL=https://www.smartnutrition-ai.ru
SESSION_SECRET=<уже существующий секрет>

BotFather > Web Login:
Redirect URI (точно):
https://www.smartnutrition-ai.ru/api/auth/telegram/callback

Trusted Origin:
https://www.smartnutrition-ai.ru

После загрузки файлов обязательно Redeploy production deployment.

Проверка после деплоя:
1) Открой https://www.smartnutrition-ai.ru/api/auth/telegram напрямую.
2) В адресе Telegram после редиректа должен быть параметр client_id=8902031881. Если видишь bot_id=..., значит Vercel всё ещё обслуживает старый код.
3) Logout должен вернуть на /login, без "Страница недоступна".
