import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function num(v: FormDataEntryValue | null) {
  if (v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  const s = await session();
  if (s?.role !== "client" || !s.chatId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const form = await req.formData();
  const currentWeight = num(form.get("current_weight_kg"));
  const sex = String(form.get("sex") || "").trim();
  const birthDate = String(form.get("birth_date") || "").trim();

  const row = {
    chat_id: s.chatId,
    goal: String(form.get("goal") || "").trim() || null,
    sex: sex || null,
    birth_date: birthDate || null,
    kcal_target: num(form.get("kcal_target")),
    protein_target: num(form.get("protein_target")),
    fat_target: num(form.get("fat_target")),
    carb_target: num(form.get("carb_target")),
    height_cm: num(form.get("height_cm")),
    current_weight_kg: currentWeight,
    target_weight_kg: num(form.get("target_weight_kg")),
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabaseAdmin();
  const { data: previous } = await supabase
    .from("client_settings")
    .select("current_weight_kg")
    .eq("chat_id", s.chatId)
    .maybeSingle();

  const { error } = await supabase
    .from("client_settings")
    .upsert(row, { onConflict: "chat_id" });

  if (error) {
    console.error("Saving client settings failed", error);
    return NextResponse.redirect(new URL("/client/profile?error=settings", req.url));
  }

  if (
    currentWeight &&
    Number(previous?.current_weight_kg || 0) !== currentWeight
  ) {
    await supabase.from("weight_logs").insert({
      chat_id: s.chatId,
      weight_kg: currentWeight,
      measured_at: new Date().toISOString(),
    });
  }

  return NextResponse.redirect(new URL("/client/profile?saved=1", req.url));
}
