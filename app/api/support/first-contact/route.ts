import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  FIRST_CONTACT_WEBHOOK,
  postProtectedRailway,
} from "@/lib/n8n-webhooks";

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
    const { data: profile, error } = await db
      .from("profiles")
      .select("telegram_id")
      .eq("telegram_id", chatId)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ ok: false, error: "Клиент не найден" }, { status: 404 });
    }

    const result = await postProtectedRailway<{
      ok?: boolean;
      duplicate?: boolean;
      message?: Record<string, unknown>;
    }>(FIRST_CONTACT_WEBHOOK, {
      chat_id: chatId,
      content,
      request_id: requestId,
    });

    if (!result.ok || !result.message) {
      throw new Error("Railway did not confirm the saved message");
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("first contact failed", error);
    return NextResponse.json(
      { ok: false, error: "Не удалось отправить первое сообщение" },
      { status: 502 },
    );
  }
}
