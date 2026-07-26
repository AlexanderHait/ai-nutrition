import TelegramLogin from "@/components/TelegramLogin";

const telegramErrors: Record<string, string> = {
  telegram_unknown:
    "Этот Telegram ещё не зарегистрирован в боте. Сначала открой бота и отправь /start.",
  telegram_config:
    "Telegram-вход временно не настроен на сервере.",
  telegram_state:
    "Сессия Telegram-входа устарела. Нажми «Войти через Telegram» ещё раз.",
  telegram_token:
    "Telegram не подтвердил авторизацию. Попробуй войти ещё раз.",
  telegram_verify:
    "Не удалось проверить ответ Telegram. Попробуй ещё раз.",
  telegram_callback:
    "Telegram вернул неполный ответ. Попробуй войти ещё раз.",
  telegram:
    "Не удалось войти через Telegram. Попробуй ещё раз.",
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  const q = await searchParams;
  const error = typeof q.error === "string" ? q.error : "";

  return (
    <main className="login">
      <div className="loginCard">
        <div className="logoMark">AI</div>
        <h1>AI‑Nutrition</h1>
        <p className="muted">Питание и прогресс без лишнего</p>

        {error.startsWith("telegram") && (
          <div className="notice">
            {telegramErrors[error] ||
              "Не удалось войти через Telegram. Попробуй ещё раз."}
          </div>
        )}

        {error === "admin" && (
          <div className="notice">
            Неверный пароль администратора.
          </div>
        )}

        <div className="loginBlock">
          <h3>Клиент</h3>
          <p>Вход через Telegram — без логина и пароля.</p>
          <TelegramLogin />
        </div>

        <div className="divider">или</div>

        <form
          action="/api/auth/admin"
          method="post"
          className="loginBlock"
        >
          <h3>Администратор</h3>
          <input
            name="password"
            type="password"
            placeholder="Пароль администратора"
            required
          />
          <button className="primary">Войти в админку</button>
        </form>
      </div>
    </main>
  );
}
