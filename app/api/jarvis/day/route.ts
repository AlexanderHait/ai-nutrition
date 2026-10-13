import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { dayKey, mealSessions, sumMeals, type Meal } from "@/lib/data";

export const dynamic = "force-dynamic";

// JARVIS владельца (пилот Б, 13.10.2026): итог одного дня одного человека,
// только чтение. Ключ создаёт JARVIS на Mac, здесь хранится лишь его SHA-256
// (`JARVIS_READ_TOKEN_SHA256`). Чей день — задаёт только `JARVIS_READ_CHAT_ID`:
// `chat_id` из запроса не принимается никогда, поэтому чужой дневник этим
// ключом не прочитать. Нет переменных — адрес выключен и отвечает 404.
// Граница суток (Б-06) не трогается: берём готовый `meals.eaten_day`.

const reply = (status: number, body: unknown) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Дата обязана существовать: Date.parse пропускает «2026-02-30».
function realDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const t = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === day;
}

// JARVIS ждёт целые неотрицательные числа и отбрасывает весь день иначе.
const whole = (v: number) => Math.max(0, Math.round(v));

export async function GET(request: Request) {
  const hash = (process.env.JARVIS_READ_TOKEN_SHA256 || "").trim().toLowerCase();
  const chatId = Number(process.env.JARVIS_READ_CHAT_ID);
  if (!/^[0-9a-f]{64}$/.test(hash) || !Number.isSafeInteger(chatId) || chatId <= 0) {
    return reply(404, { error: "not found" });
  }

  const auth = request.headers.get("authorization") || "";
  const key = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const keyHash = createHash("sha256").update(key).digest();
  if (!key || !timingSafeEqual(keyHash, Buffer.from(hash, "hex"))) {
    return reply(401, { error: "unauthorized" });
  }

  const day = new URL(request.url).searchParams.get("day") || dayKey();
  if (!realDay(day)) return reply(400, { error: "bad day" });

  let rows: Meal[];
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("meals")
      .select("id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted")
      .eq("chat_id", chatId)
      .eq("deleted", false)
      .eq("eaten_day", day)
      .order("eaten_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    rows = (data || []) as Meal[];
  } catch (error: any) {
    console.error("jarvis day lookup failed", { code: error?.code, message: error?.message });
    return reply(503, { error: "unavailable" });
  }

  const total = sumMeals(rows);
  // mealSessions отдаёт приёмы от последнего к первому, блюда внутри — по времени.
  const meals = mealSessions(rows).reverse().map((s) => ({
    time: s.meals[0].eaten_at,
    title: Array.from(s.meals.map((m) => String(m.dish || "").trim()).filter(Boolean).join(", "))
      .slice(0, 80)
      .join(""),
    kcal: whole(s.total.kcal),
  }));

  return reply(200, {
    day,
    kcal: whole(total.kcal),
    protein: whole(total.prot),
    fat: whole(total.fat),
    carbs: whole(total.carb),
    meals,
  });
}
