import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { calculateNutritionTargets } from "@/lib/client-setup";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function numberField(form: FormData, key: string) {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : NaN;
}

export async function POST(request: Request) {
  const current = await session();
  if (current?.role !== "client" || !current.accountId) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const form = await request.formData();
  const goal = String(form.get("goal") || "").trim();
  const sex = String(form.get("sex") || "") as "male" | "female";
  const age = numberField(form, "age_years");
  const heightCm = numberField(form, "height_cm");
  const weightKg = numberField(form, "current_weight_kg");
  const targetWeightKg = numberField(form, "target_weight_kg");
  const activityLevel = String(form.get("activity_level") || "") as "low" | "light" | "moderate" | "high" | "very_high";

  const validGoal = ["Снижение веса", "Поддержание", "Набор массы"].includes(goal);
  const validActivity = ["low", "light", "moderate", "high", "very_high"].includes(activityLevel);
  if (
    !validGoal
    || !["male", "female"].includes(sex)
    || age < 14 || age > 100
    || heightCm < 120 || heightCm > 230
    || weightKg < 35 || weightKg > 300
    || targetWeightKg < 35 || targetWeightKg > 300
    || !validActivity
  ) {
    return NextResponse.redirect(new URL("/client/setup?error=fields", request.url), 303);
  }

  const targets = calculateNutritionTargets({ goal, sex, age, heightCm, weightKg, activityLevel });
  const db = getSupabaseAdmin();
  const { data: previous } = await db
    .from("client_settings")
    .select("current_weight_kg,profile_data")
    .eq("account_id", current.accountId)
    .maybeSingle();

  const previousProfileData = previous?.profile_data && typeof previous.profile_data === "object"
    ? previous.profile_data as Record<string, unknown>
    : {};

  const { error } = await db.from("client_settings").upsert({
    account_id: current.accountId,
    chat_id: current.chatId || null,
    goal,
    sex,
    age_years: age,
    height_cm: heightCm,
    current_weight_kg: weightKg,
    target_weight_kg: targetWeightKg,
    activity_level: activityLevel,
    kcal_target: targets.kcal,
    protein_target: targets.protein,
    fat_target: targets.fat,
    carb_target: targets.carb,
    onboarding_source: current.chatId ? "telegram_web" : "web",
    profile_data: {
      ...previousProfileData,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_version: 2,
      target_calculation: "mifflin_st_jeor",
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: "account_id" });

  if (error) {
    console.error("Client setup failed", error);
    return NextResponse.redirect(new URL("/client/setup?error=save", request.url), 303);
  }

  if (Number(previous?.current_weight_kg || 0) !== weightKg) {
    await db.from("weight_logs").insert({
      account_id: current.accountId,
      chat_id: current.chatId || null,
      weight_kg: weightKg,
      measured_at: new Date().toISOString(),
    });
  }

  return NextResponse.redirect(new URL("/client?welcome=1", request.url), 303);
}
