import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const current = await session();
  if (current?.role !== "client" || !current.accountId) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const form = await request.formData();
  // Возврат только на заранее известные страницы — адрес из формы не подставляем.
  const fromProgram = form.get("return") === "program";
  const weight = Number(String(form.get("weight_kg") || "").replace(",", "."));
  if (!Number.isFinite(weight) || weight < 30 || weight > 400) {
    return NextResponse.redirect(new URL(fromProgram ? "/client/program?error=weight" : "/client/profile?error=weight", request.url), 303);
  }

  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const [{ error: logError }, { error: settingsError }] = await Promise.all([
    db.from("weight_logs").insert({
      account_id: current.accountId,
      chat_id: current.chatId || null,
      weight_kg: weight,
      measured_at: now,
    }),
    db.from("client_settings").upsert(
      {
        account_id: current.accountId,
        chat_id: current.chatId || null,
        current_weight_kg: weight,
        onboarding_source: current.chatId ? "telegram_web" : "web",
        updated_at: now,
      },
      { onConflict: "account_id" },
    ),
  ]);

  if (logError || settingsError) {
    console.error("Saving weight failed", { logError, settingsError });
    return NextResponse.redirect(new URL(fromProgram ? "/client/program?error=weight" : "/client/profile?error=weight", request.url), 303);
  }
  return NextResponse.redirect(new URL(fromProgram ? "/client/program?weighed=1" : "/client/progress", request.url), 303);
}
