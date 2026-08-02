import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasPremiumAccess } from "@/lib/subscription-access";

export async function POST(request: Request) {
  const auth = await session();
  if (!auth?.chatId) return NextResponse.redirect(new URL("/login", request.url), 303);
  if (!(await hasPremiumAccess(Number(auth.chatId)))) {
    return NextResponse.redirect(new URL("/client/plan?access=premium", request.url), 303);
  }

  const form = await request.formData();
  const id = Number(form.get("id"));
  const feedback = String(form.get("feedback") || "");
  const reason = String(form.get("reason") || "").slice(0, 300);
  if (!Number.isSafeInteger(id) || !["useful", "not_fit"].includes(feedback)) {
    return NextResponse.redirect(new URL("/client/coach", request.url), 303);
  }

  const { error } = await getSupabaseAdmin()
    .from("premium_recommendations")
    .update({ feedback, feedback_reason: reason || null, feedback_at: new Date().toISOString() })
    .eq("id", id)
    .eq("chat_id", Number(auth.chatId));
  if (error) console.error("premium feedback save failed", { chatId: auth.chatId, id, error });
  return NextResponse.redirect(new URL("/client/coach?feedback=1", request.url), 303);
}
