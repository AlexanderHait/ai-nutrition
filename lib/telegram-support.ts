import { getSupabaseAdmin } from "@/lib/supabase-admin";

type SupportMessage = {
  id: number;
  chat_id: number;
  content: string;
  attachment_path?: string | null;
  attachment_mime?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  delivered_to_client_at?: string | null;
  delivery_error?: string | null;
  delivery_claimed_at?: string | null;
};

type DeliveryResult = {
  delivered: boolean;
  alreadyDelivered: boolean;
  telegramMessageId?: number;
  deliveredAt?: string;
};

const TELEGRAM_TIMEOUT_MS = 15_000;
const SUPPORT_PREFIX = "💬 Ответ поддержки TeddY";
const SUPPORT_SUFFIX = "Если вопрос остался — ответьте на это сообщение.";

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return token;
}

function meaningfulContent(content: string) {
  const value = String(content || "").trim();
  return !["фото", "pdf", "документ"].includes(value.toLowerCase()) ? value : "";
}

function messageText(content: string) {
  const body = meaningfulContent(content);
  return `${SUPPORT_PREFIX}${body ? `\n\n${body}` : ""}\n\n${SUPPORT_SUFFIX}`.slice(0, 4096);
}

function captionText(content: string) {
  const body = meaningfulContent(content);
  return `${SUPPORT_PREFIX}${body ? `\n\n${body}` : ""}\n\n${SUPPORT_SUFFIX}`.slice(0, 1024);
}

async function telegramFetch(method: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok !== true) {
      const description = typeof payload?.description === "string"
        ? payload.description
        : `Telegram API failed with ${response.status}`;
      throw new Error(description);
    }
    return payload.result as { message_id?: number };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendJson(method: string, body: Record<string, unknown>) {
  return telegramFetch(method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function sendBinary(
  method: "sendPhoto" | "sendDocument",
  chatId: number,
  field: "photo" | "document",
  file: Blob,
  fileName: string,
  caption: string,
) {
  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set("caption", caption);
  form.set(field, file, fileName);
  return telegramFetch(method, { method: "POST", body: form });
}

async function readMessage(messageId: number): Promise<SupportMessage | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("support_messages")
    .select("id,chat_id,content,attachment_path,attachment_mime,attachment_name,attachment_size,delivered_to_client_at,delivery_error,delivery_claimed_at")
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw new Error(`support message lookup failed: ${error.message}`);
  return data as SupportMessage | null;
}

async function markDelivered(messageId: number) {
  const db = getSupabaseAdmin();
  const { error } = await db.rpc("mark_support_reply_delivered_v20", { _message_id: messageId });
  if (!error) return;

  const { error: fallbackError } = await db
    .from("support_messages")
    .update({ delivered_to_client_at: new Date().toISOString(), delivery_error: null })
    .eq("id", messageId)
    .eq("sender", "admin");
  if (fallbackError) {
    console.error("support delivery status update failed", { messageId, error, fallbackError });
  }
}

async function markFailed(messageId: number, reason: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.rpc("mark_support_reply_failed_v20", {
    _message_id: messageId,
    _error: reason.slice(0, 1000),
  });
  if (error) console.error("support delivery failure status update failed", { messageId, error });
}

export async function deliverSupportMessage(messageId: number): Promise<DeliveryResult> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("claim_support_reply_v20", { _message_id: messageId });
  if (error) throw new Error(`support delivery claim failed: ${error.message}`);

  const claimed = (Array.isArray(data) ? data[0] : data) as SupportMessage | undefined;
  if (!claimed?.message_id && !claimed?.id) {
    const existing = await readMessage(messageId);
    if (existing?.delivered_to_client_at) {
      return {
        delivered: true,
        alreadyDelivered: true,
        deliveredAt: existing.delivered_to_client_at,
      };
    }
    throw new Error("Сообщение уже отправляется. Обновите диалог через несколько секунд.");
  }

  const message: SupportMessage = {
    id: Number((claimed as any).message_id || claimed.id || messageId),
    chat_id: Number(claimed.chat_id),
    content: String(claimed.content || ""),
    attachment_path: claimed.attachment_path || null,
    attachment_mime: claimed.attachment_mime || null,
    attachment_name: claimed.attachment_name || null,
  };

  try {
    let result: { message_id?: number };
    if (!message.attachment_path) {
      result = await sendJson("sendMessage", {
        chat_id: message.chat_id,
        text: messageText(message.content),
      });
    } else {
      const isPdf = String(message.attachment_mime || "").toLowerCase() === "application/pdf"
        || String(message.attachment_name || "").toLowerCase().endsWith(".pdf");
      const method = isPdf ? "sendDocument" : "sendPhoto";
      const field = isPdf ? "document" : "photo";
      const caption = captionText(message.content);
      const { data: signed, error: signedError } = await db.storage
        .from("support-media")
        .createSignedUrl(message.attachment_path, 600);
      if (signedError || !signed?.signedUrl) {
        throw new Error(`support attachment URL failed: ${signedError?.message || "no signed URL"}`);
      }

      try {
        result = await sendJson(method, {
          chat_id: message.chat_id,
          [field]: signed.signedUrl,
          caption,
        });
      } catch (urlError) {
        const { data: blob, error: downloadError } = await db.storage
          .from("support-media")
          .download(message.attachment_path);
        if (downloadError || !blob) throw urlError;
        result = await sendBinary(
          method,
          message.chat_id,
          field,
          blob,
          message.attachment_name || (isPdf ? "document.pdf" : "photo.jpg"),
          caption,
        );
      }
    }

    await markDelivered(message.id);
    return {
      delivered: true,
      alreadyDelivered: false,
      telegramMessageId: Number(result?.message_id || 0) || undefined,
      deliveredAt: new Date().toISOString(),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Telegram delivery failed";
    await markFailed(message.id, reason);
    throw error;
  }
}
