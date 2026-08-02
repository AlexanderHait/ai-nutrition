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
  const weekEnd = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow" }).format(new Date());
  const row = {
    chat_id: Number(auth.chatId),
    week_end: weekEnd,
    hunger: String(form.get("hunger") || "normal"),
    energy: String(form.get("energy") || "normal"),
    adherence_ease: String(form.get("adherence_ease") || "normal"),
    note: String(form.get("note") || "").slice(0, 500),
  };
  const { error } = await getSupabaseAdmin()
    .from("premium_checkins")
    .upsert(row, { onConflict: "chat_id,week_end" });
  if (error) console.error("premium check-in save failed", { chatId: auth.chatId, error });
  return NextResponse.redirect(new URL("/client/coach?checkin=1", request.url), 303);
}
