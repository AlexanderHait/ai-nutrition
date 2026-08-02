import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function num(value: FormDataEntryValue | null) {
  if (value === null || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function POST(request: Request) {
  const current = await session();
  if (current?.role !== "client" || !current.accountId) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const form = await request.formData();
  const currentWeight = num(form.get("current_weight_kg"));
  const row = {
    account_id: current.accountId,
    chat_id: current.chatId || null,
    goal: String(form.get("goal") || "").trim() || null,
    sex: String(form.get("sex") || "").trim() || null,
    birth_date: String(form.get("birth_date") || "").trim() || null,
    age_years: num(form.get("age_years")),
    activity_level: String(form.get("activity_level") || "").trim() || null,
    kcal_target: num(form.get("kcal_target")),
    protein_target: num(form.get("protein_target")),
    fat_target: num(form.get("fat_target")),
    carb_target: num(form.get("carb_target")),
    height_cm: num(form.get("height_cm")),
    current_weight_kg: currentWeight,
    target_weight_kg: num(form.get("target_weight_kg")),
    onboarding_source: current.chatId ? "telegram_web" : "web",
    updated_at: new Date().toISOString(),
  };

  const db = getSupabaseAdmin();
  const { data: previous } = await db
    .from("client_settings")
    .select("current_weight_kg")
    .eq("account_id", current.accountId)
    .maybeSingle();

  const { error } = await db
    .from("client_settings")
    .upsert(row, { onConflict: "account_id" });
  if (error) {
    console.error("Saving client settings failed", error);
    return NextResponse.redirect(new URL("/client/profile?error=settings", request.url), 303);
  }

  if (currentWeight && Number(previous?.current_weight_kg || 0) !== currentWeight) {
    await db.from("weight_logs").insert({
      account_id: current.accountId,
      chat_id: current.chatId || null,
      weight_kg: currentWeight,
      measured_at: new Date().toISOString(),
    });
  }

  return NextResponse.redirect(new URL("/client/profile?saved=1", request.url), 303);
}
