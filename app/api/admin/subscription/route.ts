import { NextRequest, NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Plan = "none" | "basic" | "premium";
const ALLOWED = new Set<Plan>(["none", "basic", "premium"]);

export async function POST(request: NextRequest) {
  try {
    const auth = await session();
    if (auth?.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Нет доступа" }, { status: 403 });
    }

    const body = await request.json();
    const chatId = Number(body?.chatId);
    const plan = String(body?.plan || "").toLowerCase() as Plan;
    if (!Number.isFinite(chatId) || chatId <= 0) {
      return NextResponse.json({ ok: false, error: "Некорректный chatId" }, { status: 400 });
    }
    if (!ALLOWED.has(plan)) {
      return NextResponse.json({ ok: false, error: "Некорректный тариф" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const { data, error } = await (db as any).rpc("admin_set_subscription", {
      _chat_id: chatId,
      _plan: plan,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, chatId, plan, result: data });
  } catch (error) {
    console.error("admin subscription update failed", error);
    return NextResponse.json({ ok: false, error: "Не удалось изменить подписку" }, { status: 500 });
  }
}
