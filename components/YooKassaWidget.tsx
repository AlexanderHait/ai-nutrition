"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

interface YooWidgetInstance {
  render: (id: string) => Promise<void>;
  destroy: () => void;
}

type YooWidgetConstructor = new (options: {
  confirmation_token: string;
  return_url: string;
  error_callback: (error: string) => void;
  customization?: {
    modal?: boolean;
    colors?: Record<string, string>;
  };
}) => YooWidgetInstance;

declare global {
  interface Window {
    YooMoneyCheckoutWidget?: YooWidgetConstructor;
  }
}

const CONTAINER_ID = "teddy-yookassa-widget";
const LOAD_TIMEOUT_MS = 12_000;

export default function YooKassaWidget({
  token,
  returnUrl,
}: {
  token: string;
  returnUrl: string;
}) {
  const widgetRef = useRef<YooWidgetInstance | null>(null);
  const startedRef = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState("");

  const markSdkReady = useCallback(() => {
    if (window.YooMoneyCheckoutWidget) {
      setSdkReady(true);
      setError("");
    }
  }, []);

  useEffect(() => {
    markSdkReady();

    const timeout = window.setTimeout(() => {
      if (!window.YooMoneyCheckoutWidget && !rendered) {
        setError("Форма ЮKassa не загрузилась. Обнови страницу или вернись к тарифам и попробуй снова.");
      }
    }, LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [markSdkReady, rendered]);

  useEffect(() => {
    const Widget = window.YooMoneyCheckoutWidget;
    if (!sdkReady || !Widget || startedRef.current) return;

    startedRef.current = true;
    setError("");

    const dark = document.documentElement.dataset.theme === "dark";
    const widget = new Widget({
      confirmation_token: token,
      return_url: returnUrl,
      error_callback: (code) => {
        console.error("YooKassa widget initialization failed", { code });
        startedRef.current = false;
        setRendered(false);
        setError(
          code === "token_expired"
            ? "Срок действия формы истёк. Вернись к тарифам и начни оплату заново."
            : `Не удалось открыть форму оплаты${code ? ` (${code})` : ""}. Попробуй обновить страницу.`,
        );
      },
      customization: {
        modal: false,
        colors: dark
          ? {
              control_primary: "#D8B85F",
              background: "#111A18",
            }
          : {
              control_primary: "#D8B85F",
              background: "#FFFFFF",
            },
      },
    });

    widgetRef.current = widget;
    widget
      .render(CONTAINER_ID)
      .then(() => {
        setRendered(true);
        setError("");
      })
      .catch((renderError) => {
        console.error("YooKassa widget render failed", renderError);
        startedRef.current = false;
        setRendered(false);
        setError("Не удалось отобразить форму оплаты. Обнови страницу или начни оплату заново.");
      });

    return () => {
      widgetRef.current?.destroy();
      widgetRef.current = null;
      startedRef.current = false;
    };
  }, [returnUrl, sdkReady, token]);

  return (
    <>
      <Script
        id="teddy-yookassa-sdk"
        src="https://yookassa.ru/checkout-widget/v1/checkout-widget.js"
        strategy="afterInteractive"
        onReady={markSdkReady}
        onLoad={markSdkReady}
        onError={() => setError("Не удалось загрузить защищённую форму ЮKassa. Проверь соединение и попробуй снова.")}
      />

      {error ? (
        <div className="subscriptionControlError" role="alert">
          {error}
          <button type="button" className="secondaryBtn" onClick={() => window.location.reload()}>
            Обновить страницу
          </button>
        </div>
      ) : null}

      <div id={CONTAINER_ID} className="teddyYooWidget" aria-live="polite">
        {!rendered && !error ? (
          <div className="teddyPaymentLoading">Загружаем защищённую форму оплаты…</div>
        ) : null}
      </div>
    </>
  );
}
