AI-Nutrition — Telegram web popup + mobile optimization

Что изменено:
1) Кнопка Telegram использует новую Telegram Login Library и открывает браузерный popup.
2) id_token проверяется на сервере через Telegram JWKS; данные user с фронта не используются как источник истины.
3) Добавлен nonce, чтобы защитить popup-авторизацию от replay.
4) Добавлен Cross-Origin-Opener-Policy: same-origin-allow-popups, иначе Telegram popup не сможет передать результат обратно странице.
5) Оптимизированы мобильные экраны: safe-area, нижняя навигация, карточки, таблицы, диалоги, аналитика, формы, login.
6) В мобильном профиле появилась отдельная кнопка «Выйти из профиля».

Vercel переменные остаются прежними:
- TELEGRAM_CLIENT_ID
- TELEGRAM_CLIENT_SECRET (может оставаться: нужен для резервного manual OIDC flow)
- SESSION_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SITE_URL

BotFather:
- Trusted Origin должен содержать https://www.smartnutrition-ai.ru
- Для popup Login Library Redirect URI не используется самим popup-потоком, но существующий callback можно оставить для резервного manual OIDC.

После загрузки обязательно Redeploy, потому что добавлен next.config.ts.
