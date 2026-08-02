import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { coachScore } from "@/lib/coach-score";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await session();
  if (!auth) return NextResponse.json({ ok: false, error: "Нет доступа" }, { status: 401 });

  const url = new URL(request.url);
  const requestedChatId = Number(url.searchParams.get("chat_id"));
  const chatId = auth.role === "admin" ? requestedChatId : Number(auth.chatId);
  if (!Number.isSafeInteger(chatId) || chatId <= 0) {
    return NextResponse.json({ ok: false, error: "Некорректный клиент" }, { status: 400 });
  }

  const score = await coachScore(chatId, 7);
  return NextResponse.json(
    { ok: true, score },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
