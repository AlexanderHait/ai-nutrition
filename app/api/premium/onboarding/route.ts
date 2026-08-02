import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasPremiumAccess } from "@/lib/subscription-access";

const list = (value: FormDataEntryValue | null) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);

export async function POST(request: Request) {
  const auth = await session();
  if (!auth?.chatId) return NextResponse.redirect(new URL("/login", request.url), 303);
  if (!(await hasPremiumAccess(Number(auth.chatId)))) {
    return NextResponse.redirect(new URL("/client/plan?access=premium", request.url), 303);
  }

  const form = await request.formData();
  const meals = Math.max(2, Math.min(6, Number(form.get("meals_per_day") || 3)));
  const row = {
    chat_id: Number(auth.chatId),
    budget_level: String(form.get("budget_level") || "medium"),
    cooking_time: String(form.get("cooking_time") || "normal"),
    meals_per_day: meals,
    disliked_foods: list(form.get("disliked_foods")),
    preferred_foods: list(form.get("preferred_foods")),
    training_days: list(form.get("training_days")),
    notification_level: String(form.get("notification_level") || "normal"),
    response_detail: String(form.get("response_detail") || "medium"),
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const db = getSupabaseAdmin();
  const { error: onboardingError } = await db
    .from("premium_onboarding")
    .upsert(row, { onConflict: "chat_id" });
  if (onboardingError) {
    console.error("premium onboarding save failed", { chatId: auth.chatId, onboardingError });
    return NextResponse.redirect(new URL("/client/onboarding?saved=0", request.url), 303);
  }

  const memories = [
    ...row.disliked_foods.map((item) => ({
      chat_id: row.chat_id,
      memory_type: "avoid",
      memory_key: `food:${item.toLowerCase()}`,
      memory_value: item,
      confidence: 0.95,
      source: "onboarding",
      last_confirmed_at: new Date().toISOString(),
    })),
    ...row.preferred_foods.map((item) => ({
      chat_id: row.chat_id,
      memory_type: "preference",
      memory_key: `food:${item.toLowerCase()}`,
      memory_value: item,
      confidence: 0.9,
      source: "onboarding",
      last_confirmed_at: new Date().toISOString(),
    })),
  ];
  if (memories.length) {
    await db.from("client_memory").upsert(memories, {
      onConflict: "chat_id,memory_type,memory_key",
    });
  }
  await db.from("adaptive_coach_profile").upsert(
    {
      chat_id: row.chat_id,
      preferred_message_length: row.response_detail,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "chat_id" },
  );
  return NextResponse.redirect(new URL("/client/coach?onboarding=1", request.url), 303);
}
