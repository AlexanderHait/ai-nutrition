import { Send } from 'lucide-react';

export default function TelegramLogin() {
  return (
    <a className="telegramLoginButton" href="/api/auth/telegram">
      <Send size={24} />
      <span>Войти через Telegram</span>
    </a>
  );
}
