import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { postProtectedRailway, TIMELINE_WEBHOOK } from "@/lib/n8n-webhooks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await session();
    if (!auth) return NextResponse.json({ ok: false, error: "Нет доступа" }, { status: 401 });

    const url = new URL(request.url);
    const requestedChatId = Number(url.searchParams.get("chat_id"));
    const requestedLimit = Number(url.searchParams.get("limit") || 50);
    const limit = Math.max(10, Math.min(100, Number.isFinite(requestedLimit) ? requestedLimit : 50));

    const isAdmin = auth.role === "admin";
    const chatId = isAdmin ? requestedChatId : Number(auth.chatId);
    if (!Number.isSafeInteger(chatId) || chatId <= 0) {
      return NextResponse.json({ ok: false, error: "Некорректный клиент" }, { status: 400 });
    }

    const data = await postProtectedRailway<Record<string, unknown>>(TIMELINE_WEBHOOK, {
      chat_id: chatId,
      mode: isAdmin ? "admin" : "client",
      limit,
    });

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=15" },
    });
  } catch (error) {
    console.error("timeline proxy failed", error);
    return NextResponse.json(
      { ok: false, error: "Не удалось загрузить историю" },
      { status: 502 },
    );
  }
}
