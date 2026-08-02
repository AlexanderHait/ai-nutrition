import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const auth = await session();
  if (!auth?.chatId) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const action = String(form.get("action") || "");
  const db = getSupabaseAdmin();
  const chatId = Number(auth.chatId);

  if (action === "trial") {
    const { data, error } = await db.rpc("start_premium_trial_v1", { _chat_id: chatId });
    if (error) {
      console.error("Premium trial start failed", {
        chatId,
        code: error.code,
        message: error.message,
      });
      return NextResponse.redirect(new URL("/client/plan?trial=error", request.url), 303);
    }

    const result = data as { ok?: boolean; started?: boolean; reason?: string } | null;
    if (result?.started) {
      return NextResponse.redirect(new URL("/client/plan?trial=started", request.url), 303);
    }
    if (result?.reason === "premium_already_active") {
      return NextResponse.redirect(new URL("/client/coach", request.url), 303);
    }
    return NextResponse.redirect(new URL("/client/plan?trial=used", request.url), 303);
  }

  return NextResponse.redirect(new URL("/client/plan", request.url), 303);
}
