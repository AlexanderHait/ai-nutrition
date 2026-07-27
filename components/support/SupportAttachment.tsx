"use client";

import { useEffect, useState } from "react";

type Props = {
  path: string;
  name?: string | null;
};

export function SupportAttachment({ path, name }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/support/media/signed-url", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path }),
        });

        if (!res.ok) throw new Error("signed-url failed");
        const data = await res.json();
        if (!cancelled) setUrl(data.url);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (failed) {
    return (
      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/45">
        Не удалось загрузить изображение
      </div>
    );
  }

  if (!url) {
    return (
      <div className="mt-2 h-32 w-52 animate-pulse rounded-xl bg-white/[0.05]" />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 block overflow-hidden rounded-xl border border-white/10 bg-black/20 text-left transition hover:border-white/20"
        aria-label="Открыть изображение"
      >
        <img
          src={url}
          alt={name || "Вложение поддержки"}
          loading="lazy"
          className="max-h-64 w-auto max-w-[360px] object-cover"
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-5 top-5 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/15"
            aria-label="Закрыть"
          >
            ✕
          </button>

          <img
            src={url}
            alt={name || "Вложение поддержки"}
            className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
