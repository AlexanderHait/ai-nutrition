import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Мягкое удаление: профиль скрывается из админки, данные остаются в базе.
// Так дубль убирается одним нажатием, а случайно удалённого платящего
// клиента можно вернуть, обнулив deleted_at.
export async function POST(request: Request) {
  await requireAdmin();

  const form = await request.formData();
  const profileId = Number(form.get("profile_id"));
  const restore = form.get("restore") === "1";
  const back = String(form.get("back") || "/admin/clients");

  if (!Number.isInteger(profileId) || profileId <= 0) {
    return NextResponse.redirect(new URL(`${back}?client=invalid`, request.url), 303);
  }

  const db = getSupabaseAdmin();
  const { data: profile, error: readError } = await db
    .from("profiles")
    .select("id,account_id,telegram_id")
    .eq("id", profileId)
    .maybeSingle();

  if (readError || !profile) {
    console.error("client delete: profile not found", { profileId, code: readError?.code });
    return NextResponse.redirect(new URL(`${back}?client=missing`, request.url), 303);
  }

  const now = new Date().toISOString();
  const { error: profileError } = await db
    .from("profiles")
    .update({ deleted_at: restore ? null : now })
    .eq("id", profileId);

  if (profileError) {
    console.error("client delete failed", { profileId, code: profileError.code, message: profileError.message });
    return NextResponse.redirect(new URL(`${back}?client=error`, request.url), 303);
  }

  if (profile.account_id) {
    const { error: accountError } = await db
      .from("customer_accounts")
      .update({ status: restore ? "active" : "deleted" })
      .eq("id", profile.account_id);
    if (accountError) {
      console.error("client delete: account status not updated", {
        profileId,
        code: accountError.code,
        message: accountError.message,
      });
    }
  }

  return NextResponse.redirect(new URL(`${back}?client=${restore ? "restored" : "deleted"}`, request.url), 303);
}
