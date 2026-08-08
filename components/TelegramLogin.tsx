"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type TelegramAuthResult = {
  id_token?: string;
  error?: string;
};

declare global {
  interface Window {
    Telegram?: {
      Login?: {
        auth: (
          options: {
            client_id: number;
            scope?: string[];
            lang?: string;
            nonce?: string;
          },
          callback: (result: TelegramAuthResult) => void,
        ) => void;
      };
    };
  }
}

const SCRIPT_ID = "telegram-login-library";
const SCRIPT_SRC = "https://oauth.telegram.org/js/telegram-login.js?3";
const SCRIPT_LOAD_TIMEOUT_MS = 3500;

function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";
  const touchMac =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    touchMac ||
    window.matchMedia("(max-width: 820px)").matches
  );
}

function loadTelegramLibrary(): Promise<void> {
  if (typeof window === "undefined")
    return Promise.reject(new Error("browser only"));

  if (window.Telegram?.Login?.auth) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    let settled = false;
    let timeoutId: ReturnType<typeof window.setTimeout> | undefined;

    const cleanup = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };

    const handleLoad = () => {
      if (window.Telegram?.Login?.auth) finish();
      else finish(new Error("Telegram library unavailable"));
    };

    const handleError = () =>
      finish(new Error("Telegram library failed"));

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    timeoutId = window.setTimeout(() => {
      script.remove();
      finish(new Error("Telegram library timeout"));
    }, SCRIPT_LOAD_TIMEOUT_MS);

    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

export default function TelegramLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function login() {
    setLoading(true);
    setError("");

    // Mobile Telegram can return from authorization in another browser/webview.
    // Use a full-page stateless PKCE flow there.
    if (isMobileBrowser()) {
      window.location.assign("/api/auth/telegram");
      return;
    }

    // Desktop: preserve the convenient web popup.
    try {
      await loadTelegramLibrary();

      const configRes = await fetch("/api/auth/telegram/nonce", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      if (!configRes.ok) throw new Error("config");

      const { clientId, nonce } = (await configRes.json()) as {
        clientId: number;
        nonce: string;
      };

      if (!clientId || !nonce || !window.Telegram?.Login?.auth) {
        throw new Error("library");
      }

      window.Telegram.Login.auth(
        {
          client_id: clientId,
          scope: ["profile"],
          lang: "ru",
          nonce,
        },
        async (result) => {
          if (result?.error || !result?.id_token) {
            if (mounted.current) {
              setLoading(false);
              setError("Вход отменён или Telegram не вернул данные.");
            }
            return;
          }

          try {
            const res = await fetch("/api/auth/telegram/library", {
              method: "POST",
              headers: { "content-type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ id_token: result.id_token }),
            });

            const data = (await res.json().catch(() => ({}))) as {
              ok?: boolean;
              redirect?: string;
              error?: string;
            };

            if (!res.ok || !data.ok) {
              if (data.error === "unknown_user") {
                window.location.href =
                  "/login?error=telegram_unknown";
                return;
              }
              throw new Error(data.error || "auth");
            }

            window.location.href = data.redirect || "/client";
          } catch {
            if (mounted.current) {
              setLoading(false);
              setError(
                "Не удалось завершить вход. Попробуй ещё раз.",
              );
            }
          }
        },
      );
    } catch {
      setLoading(false);
      setError(
        "Веб-вход Telegram недоступен в этой сети. Используй вход кодом выше.",
      );
    }
  }

  return (
    <div className="telegramLoginWrap">
      <button
        className="telegramLoginButton"
        type="button"
        onClick={login}
        disabled={loading}
      >
        <Send size={23} />
        <span>
          {loading ? "Открываю Telegram…" : "Войти через Telegram"}
        </span>
      </button>


      {error && <small className="loginError">{error}</small>}
    </div>
  );
}
