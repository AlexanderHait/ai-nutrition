"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";

type Props = {
  chatId: number | null;
  onSent?: () => void | Promise<void>;
};

const MAX_BYTES = 10 * 1024 * 1024;

export function SupportComposer({ chatId, onSent }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  function chooseFile(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] || null;
    setError(null);

    if (!next) {
      setFile(null);
      return;
    }

    if (!next.type.startsWith("image/")) {
      setError("Можно прикрепить только изображение.");
      e.target.value = "";
      return;
    }

    if (next.size > MAX_BYTES) {
      setError("Фото должно быть не больше 10 МБ.");
      e.target.value = "";
      return;
    }

    setFile(next);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!chatId || sending || (!text.trim() && !file)) return;

    setSending(true);
    setError(null);

    try {
      const form = new FormData();
      form.set("chat_id", String(chatId));
      form.set("content", text.trim());
      if (file) form.set("file", file);

      const res = await fetch("/api/support/send", {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Не удалось отправить сообщение");
      }

      setText("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={send} className="border-t border-white/10 p-3">
      {file && preview ? (
        <div className="mb-3 flex max-w-md items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
          <img
            src={preview}
            alt="Предпросмотр"
            className="h-16 w-16 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-white/80">{file.name}</div>
            <div className="text-xs text-white/40">
              {(file.size / 1024 / 1024).toFixed(1)} МБ
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              if (fileInput.current) fileInput.current.value = "";
            }}
            className="rounded-lg px-2 py-1 text-white/45 hover:bg-white/5 hover:text-white"
            aria-label="Убрать вложение"
          >
            ✕
          </button>
        </div>
      ) : null}

      {error ? <div className="mb-2 text-xs text-red-400">{error}</div> : null}

      <div className="flex items-end gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={chooseFile}
        />

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={!chatId || sending}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-lg text-white/65 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          title="Прикрепить фото"
          aria-label="Прикрепить фото"
        >
          📎
        </button>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ответить клиенту..."
          rows={1}
          disabled={!chatId || sending}
          className="min-h-12 flex-1 resize-none rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-amber-300/40 disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />

        <button
          type="submit"
          disabled={!chatId || sending || (!text.trim() && !file)}
          className="h-12 rounded-xl bg-amber-300 px-5 text-sm font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? "Отправка…" : "Отправить"}
        </button>
      </div>
    </form>
  );
}
