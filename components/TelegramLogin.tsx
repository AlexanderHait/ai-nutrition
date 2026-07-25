"use client";

import { useEffect, useRef, useState } from "react";

export default function TelegramLogin() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const bot = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "").replace(/^@/, "").trim();
    const site = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "");

    if (!bot) {
      setFailed(true);
      return;
    }

    mount.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", bot);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-auth-url", `${site}/api/auth/telegram`);
    script.onerror = () => setFailed(true);

    mount.appendChild(script);

    const timer = window.setTimeout(() => {
      const iframe = mount.querySelector("iframe");
      if (!iframe) setFailed(true);
    }, 2500);

    return () => {
      window.clearTimeout(timer);
      mount.innerHTML = "";
    };
  }, []);

  return (
    <div>
      <div ref={mountRef} style={{ minHeight: 48, display: "flex", alignItems: "center" }} />
      {failed && (
        <div className="notice" style={{ marginTop: 12 }}>
          Кнопка Telegram не загрузилась. Проверь NEXT_PUBLIC_TELEGRAM_BOT_USERNAME и BotFather → /setdomain.
        </div>
      )}
    </div>
  );
}
