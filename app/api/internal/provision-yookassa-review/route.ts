import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const PROVISION_TOKEN = "u6GXxTl_OmHWy8380tT28Do8KdsmX0nmDZK9Mj02lsM";
const EMAIL = "yookassa.review@smartnutrition-ai.ru";
const LOGIN = "yookassa.review";

export async function GET(request: Request) {
  const supplied = new URL(request.url).searchParams.get("token") || "";
  const expected = Buffer.from(PROVISION_TOKEN);
  const actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const db = getSupabaseAdmin();
  const { data: existing } = await db
    .from("customer_accounts")
    .select("id")
    .eq("email", EMAIL)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: false, reason: "already_exists" }, { status: 409 });
  }

  const password = `${crypto.randomBytes(18).toString("base64url")}!7a`;
  const { data, error } = await db.auth.admin.createUser({
    email: EMAIL,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: "Покупатель ЮKassa",
      login: LOGIN,
      review_account: true,
    },
  });

  if (error || !data.user) {
    console.error("YooKassa review account provisioning failed", error);
    return NextResponse.json({ ok: false, reason: "create_failed" }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, email: EMAIL, login: LOGIN, password },
    { headers: { "Cache-Control": "no-store" } },
  );
}
