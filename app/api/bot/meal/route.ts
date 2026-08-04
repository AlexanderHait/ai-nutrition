import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Приём пищи из бота. Раньше маршрут писал в поля другой схемы
// (meal_name, calories, user_id, telegram_user_id) и падал при каждом вызове.
// Теперь пишет в реальные колонки meals: dish, grams, kcal, prot, fat, carb.

export const dynamic = "force-dynamic";

function positive(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

export async function POST(request: Request) {
  const secret = process.env.BOT_INGEST_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const chatId = Number(body.chat_id ?? body.telegram_id);
  const dish = String(body.dish ?? "").trim().slice(0, 200);
  if (!Number.isSafeInteger(chatId) || chatId <= 0) {
    return NextResponse.json({ error: "invalid_chat_id" }, { status: 400 });
  }
  if (!dish) {
    return NextResponse.json({ error: "dish_required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: profile } = await db
    .from("profiles")
    .select("account_id")
    .eq("telegram_id", chatId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  const eatenAt = typeof body.eaten_at === "string" && !Number.isNaN(Date.parse(body.eaten_at))
    ? new Date(body.eaten_at).toISOString()
    : new Date().toISOString();

  const { data, error } = await db
    .from("meals")
    .insert({
      chat_id: chatId,
      account_id: profile.account_id,
      dish,
      grams: positive(body.grams),
      kcal: positive(body.kcal),
      prot: positive(body.prot ?? body.protein),
      fat: positive(body.fat),
      carb: positive(body.carb ?? body.carbs),
      eaten_at: eatenAt,
    })
    .select("id,dish,kcal,prot,fat,carb,grams,eaten_at")
    .single();

  if (error) {
    console.error("bot meal insert failed", { chatId, code: error.code, message: error.message });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, meal: data });
}
