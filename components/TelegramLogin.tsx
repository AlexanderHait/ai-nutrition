"use client";

export default function TelegramLogin() {
  return (
    <a className="telegramLoginButton" href="/api/auth/telegram">
      <span className="telegramPlane" aria-hidden="true">➤</span>
      <span>Войти через Telegram</span>
    </a>
  );
}
