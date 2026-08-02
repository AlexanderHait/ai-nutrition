import Link from "next/link";
import TelegramLogin from "@/components/TelegramLogin";

const errors: Record<string, string> = {
  credentials: "Неверный логин, email или пароль.",
  email_unconfirmed: "Email ещё не подтверждён. Подтверди адрес по письму или отправь письмо повторно.",
  register_fields: "Проверь email, логин и пароль. Пароль — не менее 10 символов.",
  login_taken: "Этот логин уже занят.",
  email_taken: "Аккаунт с этим email уже существует.",
  register: "Не удалось создать аккаунт. Попробуй ещё раз.",
  auth_callback: "Ссылка авторизации устарела. Запроси новую.",
  telegram_unknown: "Этот Telegram ещё не зарегистрирован в боте. Сначала открой бота и отправь /start.",
  telegram_config: "Telegram-вход временно не настроен на сервере.",
  telegram_state: "Сессия Telegram-входа устарела. Нажми «Войти через Telegram» ещё раз.",
  telegram_token: "Telegram не подтвердил авторизацию. Попробуй ещё раз.",
  telegram_verify: "Не удалось проверить ответ Telegram. Попробуй ещё раз.",
  telegram_callback: "Telegram вернул неполный ответ. Попробуй ещё раз.",
  telegram: "Не удалось войти через Telegram. Попробуй ещё раз.",
  admin: "Неверный пароль администратора.",
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const mode = typeof query.mode === "string" ? query.mode : "login";
  const error = typeof query.error === "string" ? query.error : "";
  const email = typeof query.email === "string" ? query.email : "";

  return (
    <main className="login">
      <div className="loginCard">
        <div className="logoMark">AI</div>
        <h1>TeddY</h1>
        <p className="muted">Питание и прогресс без лишнего</p>

        {error ? <div className="notice">{errors[error] || "Не удалось выполнить вход."}</div> : null}
        {query.registered === "1" ? <div className="successNotice">Аккаунт создан. Подтверди email по письму и войди.</div> : null}
        {query.confirmation === "sent" ? <div className="successNotice">Письмо подтверждения отправлено повторно.</div> : null}
        {query.reset === "sent" ? <div className="successNotice">Если такой email зарегистрирован, ссылка для восстановления уже отправлена.</div> : null}

        {error === "email_unconfirmed" ? (
          <form action="/api/auth/password/resend-confirmation" method="post" className="loginBlock">
            <h3>Подтвердить email</h3>
            <input name="email" type="email" autoComplete="email" defaultValue={email} placeholder="Email" required />
            <button className="secondaryBtn">Отправить письмо повторно</button>
          </form>
        ) : null}

        {mode === "register" ? (
          <form action="/api/auth/password/register" method="post" className="loginBlock">
            <h3>Создать аккаунт</h3>
            <input name="name" type="text" maxLength={80} autoComplete="name" placeholder="Имя" />
            <input name="login" type="text" minLength={3} maxLength={32} autoComplete="username" placeholder="Логин: teddy.user" required />
            <input name="email" type="email" autoComplete="email" placeholder="Email" required />
            <input name="password" type="password" minLength={10} autoComplete="new-password" placeholder="Пароль — от 10 символов" required />
            <button className="primary">Зарегистрироваться</button>
            <Link className="textLink" href="/login">Уже есть аккаунт — войти</Link>
          </form>
        ) : mode === "reset" ? (
          <form action="/api/auth/password/reset" method="post" className="loginBlock">
            <h3>Восстановить пароль</h3>
            <p>Пришлём безопасную ссылку на зарегистрированный email.</p>
            <input name="email" type="email" autoComplete="email" placeholder="Email" required />
            <button className="primary">Отправить ссылку</button>
            <Link className="textLink" href="/login">Вернуться ко входу</Link>
          </form>
        ) : (
          <>
            <form action="/api/auth/password/login" method="post" className="loginBlock">
              <h3>Вход по паролю</h3>
              <input name="identifier" type="text" autoComplete="username" placeholder="Email или логин" required />
              <input name="password" type="password" autoComplete="current-password" placeholder="Пароль" required />
              <button className="primary">Войти</button>
              <div className="loginInlineLinks">
                <Link className="textLink" href="/login?mode=register">Регистрация</Link>
                <Link className="textLink" href="/login?mode=reset">Забыли пароль?</Link>
              </div>
            </form>

            <div className="divider">или</div>
            <div className="loginBlock">
              <h3>Вход через Telegram</h3>
              <p>Для клиентов, которые уже пользуются ботом.</p>
              <TelegramLogin />
            </div>
          </>
        )}

        <details className="adminLoginDetails">
          <summary>Вход администратора</summary>
          <form action="/api/auth/admin" method="post" className="loginBlock">
            <input name="password" type="password" placeholder="Пароль администратора" required />
            <button className="secondaryBtn">Войти в админку</button>
          </form>
        </details>
      </div>
    </main>
  );
}
