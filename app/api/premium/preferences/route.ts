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
  const level = String(form.get("notification_level") || "normal");
  const allowed = ["minimal", "normal", "active"];
  const row = {
    chat_id: Number(auth.chatId),
    notification_level: allowed.includes(level) ? level : "normal",
    morning_plan: form.get("morning_plan") === "on",
    smart_nudges: form.get("smart_nudges") === "on",
    weekly_review: form.get("weekly_review") === "on",
    post_meal_insights: form.get("post_meal_insights") === "on",
    updated_at: new Date().toISOString(),
  };
  const { error } = await getSupabaseAdmin()
    .from("premium_preferences")
    .upsert(row, { onConflict: "chat_id" });
  if (error) console.error("premium preferences save failed", { chatId: auth.chatId, error });

  const url = new URL("/client/coach", request.url);
  url.searchParams.set("saved", error ? "0" : "1");
  return NextResponse.redirect(url, 303);
}
