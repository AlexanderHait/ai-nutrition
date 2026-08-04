"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

interface YooWidgetInstance {
  render: (id: string) => Promise<void>;
  destroy: () => void;
}

declare global {
  interface Window {
    YooMoneyCheckoutWidget?: new (options: {
      confirmation_token: string;
      return_url: string;
      error_callback: (error: string) => void;
      customization?: {
        modal?: boolean;
        colors?: Record<string, string>;
      };
    }) => YooWidgetInstance;
  }
}

export default function YooKassaWidget({
  token,
  returnUrl,
}: {
  token: string;
  returnUrl: string;
}) {
  const widgetRef = useRef<YooWidgetInstance | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!scriptReady || !window.YooMoneyCheckoutWidget || widgetRef.current) return;

    const dark = document.documentElement.dataset.theme === "dark";
    const widget = new window.YooMoneyCheckoutWidget({
      confirmation_token: token,
      return_url: returnUrl,
      error_callback: (code) => {
        console.error("YooKassa widget initialization failed", { code });
        setError(code === "token_expired"
          ? "Срок действия формы истёк. Вернись к тарифам и начни оплату заново."
          : "Не удалось загрузить форму оплаты. Обнови страницу или попробуй позже.");
      },
      customization: {
        modal: false,
        colors: dark
          ? {
              control_primary: "#D8B85F",
              control_primary_content: "#10221D",
              background: "#111A18",
              text: "#F3F6F4",
              border: "#33453F",
              control_secondary: "#9AAEA7",
            }
          : {
              control_primary: "#D8B85F",
              control_primary_content: "#10221D",
              background: "#FFFFFF",
              text: "#173A32",
              border: "#C8D6CF",
              control_secondary: "#60766F",
            },
      },
    });

    widgetRef.current = widget;
    widget.render("teddy-yookassa-widget").catch(() => {
      setError("Не удалось отобразить форму оплаты. Обнови страницу или попробуй позже.");
    });

    return () => {
      widgetRef.current?.destroy();
      widgetRef.current = null;
    };
  }, [returnUrl, scriptReady, token]);

  return (
    <>
      <Script
        src="https://yookassa.ru/checkout-widget/v1/checkout-widget.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError("Не удалось загрузить защищённую форму ЮKassa.")}
      />
      {error ? <div className="subscriptionControlError">{error}</div> : null}
      <div id="teddy-yookassa-widget" className="teddyYooWidget" aria-live="polite">
        {!scriptReady && !error ? <div className="teddyPaymentLoading">Загружаем защищённую форму оплаты…</div> : null}
      </div>
    </>
  );
}
