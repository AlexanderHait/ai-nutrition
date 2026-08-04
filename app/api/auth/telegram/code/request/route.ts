import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const IDENTIFIER_RE = /^.{3,254}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_TTL_MINUTES = 10;
const MAX_REQUESTS_PER_15_MINUTES = 3;

function codeHash(accountId: string, code: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  return crypto
    .createHmac("sha256", secret)
    .update(`${accountId}:${code}`)
    .digest("hex");
}

function loginUrl(requestUrl: string, params: Record<string, string>) {
  const url = new URL("/login", requestUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

type LoginAccount = {
  id: string;
  telegram_id: string | number | null;
  display_name: string | null;
};

async function resolveAccount(identifier: string): Promise<LoginAccount | null> {
  const db = getSupabaseAdmin();
  const normalized = identifier.trim().toLowerCase();
  const username = normalized.replace(/^@+/, "");

  if (EMAIL_RE.test(normalized)) {
    const { data, error } = await db
      .from("customer_accounts")
      .select("id,telegram_id,display_name")
      .eq("status", "active")
      .ilike("email", normalized)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  const { data: account, error: accountError } = await db
    .from("customer_accounts")
    .select("id,telegram_id,display_name")
    .eq("status", "active")
    .ilike("login", username)
    .maybeSingle();
  if (accountError) throw accountError;
  if (account) return account;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("account_id,telegram_id")
    .is("deleted_at", null)
    .ilike("username", username)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.account_id) return null;

  const { data: linkedAccount, error: linkedError } = await db
    .from("customer_accounts")
    .select("id,telegram_id,display_name")
    .eq("id", profile.account_id)
    .eq("status", "active")
    .maybeSingle();
  if (linkedError) throw linkedError;
  if (!linkedAccount) return null;

  return {
    ...linkedAccount,
    telegram_id: linkedAccount.telegram_id || profile.telegram_id,
  };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const identifier = String(form.get("identifier") || "").trim().toLowerCase();

  if (!IDENTIFIER_RE.test(identifier)) {
    return NextResponse.redirect(loginUrl(request.url, { error: "telegram_code_identifier" }), 303);
  }

  const db = getSupabaseAdmin();
  let account: LoginAccount | null = null;

  try {
    account = await resolveAccount(identifier);
  } catch (error) {
    console.error("telegram login code account lookup failed", error);
    return NextResponse.redirect(loginUrl(request.url, { error: "telegram_code_unavailable" }), 303);
  }

  if (!account?.id || !account.telegram_id) {
    return NextResponse.redirect(loginUrl(request.url, {
      error: "telegram_code_not_linked",
      identifier,
    }), 303);
  }

  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count, error: countError } = await db
    .from("telegram_login_codes")
    .select("id", { count: "exact", head: true })
    .eq("account_id", account.id)
    .gte("created_at", since);

  if (countError) {
    console.error("telegram login code rate lookup failed", countError);
    return NextResponse.redirect(loginUrl(request.url, { error: "telegram_code_unavailable" }), 303);
  }

  if ((count || 0) >= MAX_REQUESTS_PER_15_MINUTES) {
    return NextResponse.redirect(loginUrl(request.url, {
      error: "telegram_code_rate",
      identifier,
    }), 303);
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  const { data: createdCode, error: insertError } = await db
    .from("telegram_login_codes")
    .insert({
      account_id: account.id,
      code_hash: codeHash(account.id, code),
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("telegram login code save failed", { code: insertError.code, message: insertError.message });
    return NextResponse.redirect(loginUrl(request.url, { error: "telegram_code_unavailable" }), 303);
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("telegram login code delivery failed: bot token missing");
    await db.from("telegram_login_codes").delete().eq("id", createdCode.id);
    return NextResponse.redirect(loginUrl(request.url, { error: "telegram_code_unavailable" }), 303);
  }

  const message = [
    "🔐 Код входа в TeddY",
    "",
    `<b>${code}</b>`,
    "",
    `Код действует ${CODE_TTL_MINUTES} минут. Никому его не сообщай.`,
  ].join("\n");

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: String(account.telegram_id),
        text: message,
        parse_mode: "HTML",
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("telegram login code delivery failed", { status: response.status, body: body.slice(0, 300) });
      await db.from("telegram_login_codes").delete().eq("id", createdCode.id);
      return NextResponse.redirect(loginUrl(request.url, { error: "telegram_code_delivery" }), 303);
    }
  } catch (error) {
    console.error("telegram login code delivery failed", error);
    await db.from("telegram_login_codes").delete().eq("id", createdCode.id);
    return NextResponse.redirect(loginUrl(request.url, { error: "telegram_code_delivery" }), 303);
  }

  return NextResponse.redirect(loginUrl(request.url, {
    telegram_code: "sent",
    identifier,
  }), 303);
}
