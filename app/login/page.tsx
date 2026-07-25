import TelegramLogin from "@/components/TelegramLogin";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
            {error === "telegram_unknown"
              ? "Этот Telegram ещё не зарегистрирован в боте. Сначала открой бота и отправь /start."
              : "Не удалось войти через Telegram. Попробуй ещё раз."}
          </div>
        )}
        {error === "admin" && (
          <div className="notice">Неверный пароль администратора.</div>
        )}

        <div className="loginBlock">
          <h3>Клиент</h3>
          <p>Вход через Telegram — без логина и пароля.</p>
          <TelegramLogin />
        </div>

        <div className="divider">или</div>

        <form action="/api/auth/admin" method="post" className="loginBlock">
          <h3>Администратор</h3>
          <input name="password" type="password" placeholder="Пароль администратора" required />
          <button className="primary">Войти в админку</button>
        </form>
      </div>
    </main>
  );
}
