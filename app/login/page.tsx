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
  telegram_code_identifier: "Укажи email, логин TeddY или Telegram username.",
  telegram_code_not_linked: "Аккаунт не найден или Telegram ещё не связан с ним. Открой бота TeddY, отправь /start и повтори.",
  telegram_code_invalid: "Код неверный. Проверь сообщение от бота и попробуй ещё раз.",
  telegram_code_expired: "Код истёк или использован. Запроси новый.",
  telegram_code_rate: "Слишком много запросов. Подожди 15 минут и попробуй снова.",
  telegram_code_delivery: "Бот не смог отправить код. Открой TeddY в Telegram, нажми /start и повтори.",
  telegram_code_unavailable: "Вход по коду временно недоступен. Попробуй вход по паролю.",
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
  const identifier = typeof query.identifier === "string" ? query.identifier : "";
  const telegramCodeSent = query.telegram_code === "sent";

  return (
    <main className="login loginV2">
      <style>{`
        .loginV2{--login-bg:var(--bg);--login-panel:var(--panel);--login-panel-soft:var(--surface-soft);--login-border:var(--line);--login-text:var(--text);--login-muted:var(--muted);--login-muted-strong:var(--body,var(--text));--login-gold:var(--gold);min-height:100svh;padding:28px 16px 48px;background:radial-gradient(700px 360px at 50% -120px,color-mix(in srgb,var(--gold) 16%,transparent),transparent 62%),linear-gradient(180deg,var(--bg),var(--panel));color:var(--login-text);display:grid;place-items:center}
        .loginV2 .loginCard{width:min(520px,100%);padding:30px;border:1px solid var(--login-border);border-radius:24px;background:linear-gradient(180deg,rgba(18,36,31,.98),rgba(11,25,22,.99));box-shadow:0 28px 80px rgba(0,0,0,.34)}
        .loginV2 .logoMark{width:58px;height:58px;margin:0 auto 12px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,var(--gold-btn),var(--gold-btn2));color:var(--on-gold);font-weight:900;font-size:17px}
        .loginV2 h1{margin:0;text-align:center;font-size:36px;letter-spacing:-1px;color:var(--login-text)}
        .loginV2>.loginCard>.muted{margin:6px 0 24px;text-align:center;color:var(--login-muted)!important;font-size:15px}
        .loginV2 .loginBlock{display:grid;gap:12px}
        .loginV2 section.loginBlock,.loginV2 form.loginBlock,.loginV2 .adminLoginDetails{padding:18px;border:1px solid var(--login-border);border-radius:17px;background:var(--login-panel-soft)}
        .loginV2 .loginBlock .loginBlock{padding:0;border:0;background:transparent}
        .loginV2 h3{margin:0;color:var(--login-text);font-size:18px}
        .loginV2 p{margin:0;color:var(--login-muted);font-size:14px;line-height:1.55}
        .loginV2 input{min-height:50px;background:var(--surface-soft);border-color:var(--line2);color:var(--login-text);font-size:16px}
        .loginV2 input::placeholder{color:var(--muted);opacity:1}
        .loginV2 input:focus{border-color:var(--login-gold);box-shadow:0 0 0 3px rgba(227,197,104,.14);background:var(--surface)}
        .loginV2 input:-webkit-autofill{-webkit-text-fill-color:var(--login-text);-webkit-box-shadow:0 0 0 1000px var(--surface-soft) inset}
        .loginV2 .primary,.loginV2 .secondaryBtn{min-height:48px;justify-content:center;border-radius:13px;font-weight:800}
        .loginV2 .primary{background:linear-gradient(135deg,var(--gold-btn),var(--gold-btn2));color:var(--on-gold)}
        .loginV2 .secondaryBtn{width:100%;background:var(--surface-soft);border-color:var(--line2);color:var(--login-text)}
        .loginV2 .textLink{color:var(--gold);font-weight:750}
        .loginV2 .divider{display:flex;align-items:center;gap:12px;margin:18px 0;color:var(--muted2);font-size:13px}
        .loginV2 .divider:before,.loginV2 .divider:after{content:"";height:1px;flex:1;background:var(--panel2)}
        .loginV2 .loginInlineLinks{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
        .loginV2 .notice,.loginV2 .successNotice{margin-bottom:14px;border-radius:14px;padding:13px 14px;font-size:14px;line-height:1.45}
        .loginV2 .notice{border:1px solid color-mix(in srgb,var(--red) 45%,transparent);background:color-mix(in srgb,var(--red) 14%,var(--surface));color:var(--red)}
        .loginV2 .successNotice{border:1px solid color-mix(in srgb,var(--green) 45%,transparent);background:color-mix(in srgb,var(--green) 14%,var(--surface));color:var(--green)}
        .loginV2 details{margin-top:14px}
        .loginV2 details summary{cursor:pointer;color:var(--login-muted-strong);font-size:14px;font-weight:700}
        .loginV2 details[open] summary{margin-bottom:14px;color:var(--login-text)}
        .loginV2 .telegramLoginWrap{display:grid;gap:9px}
        .loginV2 .telegramLoginButton{width:100%;min-height:52px;border:0;border-radius:13px;display:flex;align-items:center;justify-content:center;gap:10px;background:#2aabee;color:#fff;font-size:16px;font-weight:850;cursor:pointer}
        .loginV2 .telegramLoginButton:disabled{opacity:.7;cursor:wait}
        .loginV2 .loginError{color:var(--red);line-height:1.4}
        .loginV2 .loginMethodDetails{margin-top:14px;padding:16px;border:1px solid var(--login-border);border-radius:17px;background:var(--login-panel-soft)}
        .loginV2 .loginMethodDetails>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px}
        .loginV2 .loginMethodDetails>summary::-webkit-details-marker{display:none}
        .loginV2 .loginMethodDetails>summary:after{content:"+";font-size:20px;color:var(--login-gold)}
        .loginV2 .loginMethodDetails[open]>summary:after{content:"−"}
        .loginV2 .loginMethodDetails .loginBlock{padding:0;border:0;background:transparent}
        .loginV2 .adminSecretLogin{width:22px;margin:15px 0 0 auto!important;position:relative}
        .loginV2 .adminSecretLogin[open]{width:100%}
        .loginV2 .adminSecretLogin>summary{list-style:none;width:22px;height:22px;margin-left:auto;display:grid;place-items:center;border:1px solid var(--login-border);border-radius:50%;color:var(--login-muted);opacity:.16;font-size:10px;cursor:pointer}
        .loginV2 .adminSecretLogin>summary::-webkit-details-marker{display:none}
        .loginV2 .adminSecretLogin>summary:hover,.loginV2 .adminSecretLogin[open]>summary{opacity:.55}
        .loginV2 .adminSecretLogin[open]>summary{margin:0 0 9px auto!important}
        .loginV2 .adminSecretPanel{padding:14px;border:1px solid var(--login-border);border-radius:15px;background:var(--login-panel-soft)}
        .loginV2 .adminSecretPanel .loginBlock{padding:0;border:0;background:transparent}
        @media(max-width:560px){.loginV2{padding:18px 12px 32px;place-items:start center}.loginV2 .loginCard{padding:21px 16px;border-radius:20px}.loginV2 h1{font-size:32px}.loginV2 section.loginBlock,.loginV2 form.loginBlock,.loginV2 .adminLoginDetails{padding:16px}}
      `}</style>

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
            <section className="loginBlock telegramPrimary">
              <h3>Вход через Telegram</h3>
              <p>Быстрый вход в личный кабинет через официальный Telegram.</p>
              <TelegramLogin />
            </section>

            <div className="divider">или</div>

            <form action="/api/auth/password/login" method="post" className="loginBlock">
              <h3>Вход по паролю</h3>
              <input name="identifier" type="text" autoComplete="username" placeholder="Email или логин" required />
              <input name="password" type="password" autoComplete="current-password" placeholder="Пароль" required />
              <button className="secondaryBtn">Войти по паролю</button>
              <div className="loginInlineLinks">
                <Link className="textLink" href="/login?mode=register">Регистрация</Link>
                <Link className="textLink" href="/login?mode=reset">Забыли пароль?</Link>
              </div>
            </form>

            <details className="loginMethodDetails">
              <summary>Войти по @тегу или коду из Telegram</summary>
              <section className="loginBlock">
                <p>Укажи email, логин TeddY или Telegram username — бот пришлёт одноразовый код.</p>

                {telegramCodeSent ? (
                  <>
                    <div className="successNotice">Код отправлен ботом TeddY. Он действует 10 минут.</div>
                    <form action="/api/auth/telegram/code/verify" method="post" className="loginBlock">
                      <input type="hidden" name="identifier" value={identifier} />
                      <input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="6-значный код" required autoFocus />
                      <button className="primary">Войти в TeddY</button>
                    </form>
                    <form action="/api/auth/telegram/code/request" method="post">
                      <input type="hidden" name="identifier" value={identifier} />
                      <button className="secondaryBtn">Отправить новый код</button>
                    </form>
                  </>
                ) : (
                  <form action="/api/auth/telegram/code/request" method="post" className="loginBlock">
                    <input name="identifier" type="text" autoComplete="username" defaultValue={identifier} placeholder="Email, логин или @username" required />
                    <button className="primary">Получить код в Telegram</button>
                  </form>
                )}
              </section>
            </details>
          </>
        )}

        <details className="adminSecretLogin">
          <summary aria-label="Служебный вход"><span aria-hidden="true">◆</span></summary>
          <div className="adminSecretPanel">
            <form action="/api/auth/admin" method="post" className="loginBlock">
              <input name="password" type="password" autoComplete="current-password" placeholder="Пароль администратора" required />
              <button className="secondaryBtn">Войти в админку</button>
            </form>
          </div>
        </details>
      </div>
    </main>
  );
}
