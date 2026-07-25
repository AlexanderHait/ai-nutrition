import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const s = await session();
  if (s?.role !== "client" || !s.chatId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const form = await req.formData();
  const weight = Number(form.get("weight_kg"));
  if (!Number.isFinite(weight) || weight < 30 || weight > 400) {
    return NextResponse.redirect(new URL("/client/profile?error=weight", req.url));
  }

  const supabase = getSupabaseAdmin();

  const [{ error: logError }, { error: settingsError }] = await Promise.all([
    supabase.from("weight_logs").insert({
      chat_id: s.chatId,
      weight_kg: weight,
      measured_at: new Date().toISOString(),
    }),
    supabase.from("client_settings").upsert(
      {
        chat_id: s.chatId,
        current_weight_kg: weight,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "chat_id" },
    ),
  ]);

  if (logError || settingsError) {
    return NextResponse.redirect(new URL("/client/profile?error=weight", req.url));
  }

  return NextResponse.redirect(new URL("/client/progress", req.url));
}
