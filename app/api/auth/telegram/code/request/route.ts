import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const IDENTIFIER_RE = /^.{3,254}$/;
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

export async function POST(request: Request) {
  const form = await request.formData();
  const identifier = String(form.get("identifier") || "").trim().toLowerCase();

  if (!IDENTIFIER_RE.test(identifier)) {
    return NextResponse.redirect(loginUrl(request.url, { error: "telegram_code_identifier" }), 303);
  }

  const db = getSupabaseAdmin();
  let accountQuery = db
    .from("customer_accounts")
    .select("id,telegram_id,display_name")
    .eq("status", "active");

  accountQuery = identifier.includes("@")
    ? accountQuery.ilike("email", identifier)
    : accountQuery.ilike("login", identifier);

  const { data: account, error: accountError } = await accountQuery.maybeSingle();
  if (accountError) {
    console.error("telegram login code account lookup failed", { code: accountError.code, message: accountError.message });
    return NextResponse.redirect(loginUrl(request.url, { error: "telegram_code_unavailable" }), 303);
  }

  // Generic response prevents account enumeration. Users without a linked
  // Telegram account simply do not receive a message.
  if (!account?.id || !account.telegram_id) {
    return NextResponse.redirect(loginUrl(request.url, {
      telegram_code: "sent",
      identifier,
    }), 303);
  }

  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await db
    .from("telegram_login_codes")
    .select("id", { count: "exact", head: true })
    .eq("account_id", account.id)
    .gte("created_at", since);

  if ((count || 0) >= MAX_REQUESTS_PER_15_MINUTES) {
    return NextResponse.redirect(loginUrl(request.url, {
      error: "telegram_code_rate",
      identifier,
    }), 303);
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  const { error: insertError } = await db.from("telegram_login_codes").insert({
    account_id: account.id,
    code_hash: codeHash(account.id, code),
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("telegram login code save failed", { code: insertError.code, message: insertError.message });
    return NextResponse.redirect(loginUrl(request.url, { error: "telegram_code_unavailable" }), 303);
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("telegram login code delivery failed: bot token missing");
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
      return NextResponse.redirect(loginUrl(request.url, { error: "telegram_code_delivery" }), 303);
    }
  } catch (error) {
    console.error("telegram login code delivery failed", error);
    return NextResponse.redirect(loginUrl(request.url, { error: "telegram_code_delivery" }), 303);
  }

  return NextResponse.redirect(loginUrl(request.url, {
    telegram_code: "sent",
    identifier,
  }), 303);
}
