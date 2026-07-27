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
      <div className="supportAttachmentError">
        Не удалось загрузить изображение
      </div>
    );
  }

  if (!url) {
    return (
      <div className="supportAttachmentLoading" />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="supportAttachmentThumb"
        aria-label="Открыть изображение"
      >
        <img
          src={url}
          alt={name || "Вложение поддержки"}
          loading="lazy"
          className="supportAttachmentImage"
        />
      </button>

      {open && (
        <div
          className="supportLightbox"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="supportLightboxClose"
            aria-label="Закрыть"
          >
            ✕
          </button>

          <img
            src={url}
            alt={name || "Вложение поддержки"}
            className="supportLightboxImage"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
