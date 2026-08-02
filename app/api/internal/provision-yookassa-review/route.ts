import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

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
  const { data: account, error: accountError } = await db
    .from("customer_accounts")
    .select("id,auth_user_id,email,login,telegram_id,status")
    .eq("email", EMAIL)
    .single();
  if (accountError || !account?.auth_user_id) {
    return NextResponse.json({ ok: false, reason: "account_missing" }, { status: 500 });
  }

  const password = `${crypto.randomBytes(18).toString("base64url")}!7a`;
  const { error: passwordError } = await db.auth.admin.updateUserById(
    account.auth_user_id,
    { password },
  );
  if (passwordError) {
    return NextResponse.json({ ok: false, reason: "password_update_failed" }, { status: 500 });
  }

  const client = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: loginData, error: loginError } = await client.auth.signInWithPassword({
    email: EMAIL,
    password,
  });
  if (loginError || !loginData.user || !loginData.session) {
    return NextResponse.json({ ok: false, reason: "password_login_failed" }, { status: 500 });
  }

  const [{ data: ownAccount, error: ownAccountError }, { data: ownProfile, error: ownProfileError }] = await Promise.all([
    client.from("customer_accounts").select("id,email,login,telegram_id,status").single(),
    client.from("profiles").select("account_id,telegram_id,first_name").single(),
  ]);

  const { data: products, error: productsError } = await db
    .from("subscription_products")
    .select("plan,price_rub,enabled")
    .eq("enabled", true)
    .order("sort_order");

  const { data: lifecycle, error: lifecycleError } = await db
    .from("subscription_lifecycle")
    .select("account_id,chat_id,plan,state")
    .eq("account_id", account.id)
    .single();

  const ok =
    !ownAccountError &&
    !ownProfileError &&
    !productsError &&
    !lifecycleError &&
    ownAccount?.id === account.id &&
    ownProfile?.account_id === account.id &&
    ownAccount?.telegram_id === null &&
    lifecycle?.chat_id === null &&
    lifecycle?.plan === "basic";

  return NextResponse.json(
    {
      ok,
      email: EMAIL,
      login: LOGIN,
      password,
      checks: {
        password_login: Boolean(loginData.session),
        rls_account: !ownAccountError && ownAccount?.id === account.id,
        rls_profile: !ownProfileError && ownProfile?.account_id === account.id,
        no_fake_telegram_id: ownAccount?.telegram_id === null && lifecycle?.chat_id === null,
        basic_subscription: lifecycle?.plan === "basic" && lifecycle?.state === "active",
        plans_available: Array.isArray(products) && products.length >= 2,
      },
    },
    { status: ok ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  );
}
