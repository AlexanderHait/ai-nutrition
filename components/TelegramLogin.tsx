"use client";

import { useEffect, useRef } from "react";

export default function TelegramLogin() {
  const ref = useRef<HTMLDivElement>(null);
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://smartnutrition-ai.ru";

  useEffect(() => {
    if (!ref.current || !bot) return;
    ref.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", bot.replace(/^@/, ""));
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-auth-url", `${site.replace(/\/$/, "")}/api/auth/telegram`);
    ref.current.appendChild(script);

    return () => {
      if (ref.current) ref.current.innerHTML = "";
    };
  }, [bot, site]);

  if (!bot) {
    return <div className="notice">Не задан NEXT_PUBLIC_TELEGRAM_BOT_USERNAME.</div>;
  }

  return <div ref={ref} style={{ minHeight: 44, display: "flex", alignItems: "center" }} />;
}
