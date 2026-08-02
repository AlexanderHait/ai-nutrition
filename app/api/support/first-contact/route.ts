import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { deliverSupportMessage } from "@/lib/telegram-support";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const auth = await session();
    if (auth?.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Нет доступа" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const chatId = Number(body?.chat_id);
    const content = String(body?.content || "").trim();
    const requestId = String(body?.request_id || "").trim();

    if (!Number.isSafeInteger(chatId) || chatId <= 0) {
      return NextResponse.json({ ok: false, error: "Некорректный клиент" }, { status: 400 });
    }
    if (!content || content.length > 3000) {
      return NextResponse.json({ ok: false, error: "Введите сообщение до 3000 символов" }, { status: 400 });
    }
    if (!UUID_RE.test(requestId)) {
      return NextResponse.json({ ok: false, error: "Некорректный идентификатор отправки" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await (db as any).rpc("create_admin_support_message_v1", {
      _chat_id: chatId,
      _content: content,
      _request_id: requestId,
      _attachment_path: null,
      _attachment_mime: null,
      _attachment_name: null,
      _attachment_size: null,
    });
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result?.message_id) {
      throw new Error(`support message RPC failed: ${error?.message || "no row returned"}`);
    }

    const delivery = await deliverSupportMessage(Number(result.message_id));
    const message = {
      id: Number(result.message_id),
      chat_id: Number(result.chat_id),
      sender: "admin",
      content: String(result.content || ""),
      created_at: result.created_at,
      attachment_path: null,
      attachment_mime: null,
      attachment_name: null,
      attachment_size: null,
      delivered_to_client_at: delivery.deliveredAt || new Date().toISOString(),
      delivery_error: null,
    };

    return NextResponse.json(
      { ok: true, duplicate: Boolean(result.duplicate), message },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("first contact failed", error);
    const detail = error instanceof Error ? error.message : "Неизвестная ошибка";
    const publicError = /chat not found|bot was blocked|user is deactivated|chat_id/i.test(detail)
      ? "Telegram не принимает сообщения для этого клиента"
      : "Не удалось отправить первое сообщение";
    return NextResponse.json({ ok: false, error: publicError }, { status: 502 });
  }
}
