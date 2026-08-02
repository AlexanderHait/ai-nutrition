import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const REVIEW_USER_ID = "dfe47e0a-9ec7-4a78-a465-3e880486c983";

export async function GET() {
  const db = getSupabaseAdmin();
  const { data: current, error: readError } = await db.auth.admin.getUserById(REVIEW_USER_ID);
  if (readError || !current.user) {
    return NextResponse.json({ ok: false, error: "review_user_missing" }, { status: 404 });
  }

  if (current.user.user_metadata?.review_password_rotated_at) {
    return NextResponse.json({ ok: false, error: "already_rotated" }, { status: 410 });
  }

  const password = `${randomBytes(18).toString("base64url")}!7a`;
  const { error } = await db.auth.admin.updateUserById(REVIEW_USER_ID, {
    password,
    email_confirm: true,
    user_metadata: {
      ...current.user.user_metadata,
      review_password_rotated_at: new Date().toISOString(),
    },
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "rotation_failed" }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, login: "yookassa.review", email: "yookassa.review@smartnutrition-ai.ru", password },
    { headers: { "Cache-Control": "no-store" } },
  );
}
