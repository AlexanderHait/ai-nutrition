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
  const row = {
    chat_id: s.chatId,
    goal: String(form.get("goal") || "") || null,
    kcal_target: num(form.get("kcal_target")),
    protein_target: num(form.get("protein_target")),
    fat_target: num(form.get("fat_target")),
    carb_target: num(form.get("carb_target")),
    height_cm: num(form.get("height_cm")),
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("client_settings").upsert(row, { onConflict: "chat_id" });

  if (error) {
    return NextResponse.redirect(new URL("/client/profile?error=settings", req.url));
  }

  return NextResponse.redirect(new URL("/client/profile?saved=1", req.url));
}
