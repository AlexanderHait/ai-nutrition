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
  const action = String(form.get("action") || "");
  if (!Number.isSafeInteger(id) || !["apply", "dismiss"].includes(action)) {
    return NextResponse.redirect(new URL("/client/coach", request.url), 303);
  }

  const db = getSupabaseAdmin();
  const { data: proposal, error: readError } = await db
    .from("premium_target_proposals")
    .select("*")
    .eq("id", id)
    .eq("chat_id", Number(auth.chatId))
    .eq("status", "pending")
    .maybeSingle();
  if (readError || !proposal) {
    if (readError) console.error("premium proposal lookup failed", { chatId: auth.chatId, id, readError });
    return NextResponse.redirect(new URL("/client/coach", request.url), 303);
  }

  if (action === "apply") {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (proposal.proposed_kcal) update.kcal_target = proposal.proposed_kcal;
    if (proposal.proposed_protein) update.protein_target = proposal.proposed_protein;
    if (proposal.proposed_fat) update.fat_target = proposal.proposed_fat;
    if (proposal.proposed_carb) update.carb_target = proposal.proposed_carb;

    const { error: settingsError } = await db
      .from("client_settings")
      .update(update)
      .eq("chat_id", Number(auth.chatId));
    if (settingsError) {
      console.error("premium proposal settings update failed", { chatId: auth.chatId, id, settingsError });
      return NextResponse.redirect(new URL("/client/coach", request.url), 303);
    }

    await db
      .from("premium_target_proposals")
      .update({ status: "applied", resolved_at: new Date().toISOString() })
      .eq("id", id)
      .eq("chat_id", Number(auth.chatId));
  } else {
    await db
      .from("premium_target_proposals")
      .update({ status: "dismissed", resolved_at: new Date().toISOString() })
      .eq("id", id)
      .eq("chat_id", Number(auth.chatId));
  }

  return NextResponse.redirect(new URL("/client/coach", request.url), 303);
}
