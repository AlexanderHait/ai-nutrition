import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sessionCookie, signSession } from "@/lib/auth";
import { resolveTelegramLoginAccount } from "@/lib/telegram-login-account";

export const dynamic = "force-dynamic";

const CODE_RE = /^\d{6}$/;
const MAX_ATTEMPTS = 5;

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
  const code = String(form.get("code") || "").trim();

  if (!identifier || !CODE_RE.test(code)) {
    return NextResponse.redirect(loginUrl(request.url, {
      error: "telegram_code_invalid",
      identifier,
      telegram_code: "sent",
    }), 303);
  }

  const db = getSupabaseAdmin();
  let account = null;
  try {
    account = await resolveTelegramLoginAccount(identifier);
  } catch (error) {
    console.error("telegram login code account lookup failed", error);
  }
  if (!account?.id || !account.telegram_id) {
    return NextResponse.redirect(loginUrl(request.url, {
      error: "telegram_code_invalid",
      identifier,
      telegram_code: "sent",
    }), 303);
  }

  const { data: loginCode, error: codeError } = await db
    .from("telegram_login_codes")
    .select("id,code_hash,expires_at,attempts,consumed_at")
    .eq("account_id", account.id)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (codeError || !loginCode || Number(loginCode.attempts) >= MAX_ATTEMPTS) {
    return NextResponse.redirect(loginUrl(request.url, {
      error: "telegram_code_expired",
      identifier,
    }), 303);
  }

  const expected = String(loginCode.code_hash);
  const actual = codeHash(account.id, code);
  const valid = expected.length === actual.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));

  if (!valid) {
    await db
      .from("telegram_login_codes")
      .update({ attempts: Number(loginCode.attempts) + 1 })
      .eq("id", loginCode.id);

    return NextResponse.redirect(loginUrl(request.url, {
      error: "telegram_code_invalid",
      identifier,
      telegram_code: "sent",
    }), 303);
  }

  const consumedAt = new Date().toISOString();
  const { error: consumeError } = await db
    .from("telegram_login_codes")
    .update({ consumed_at: consumedAt })
    .eq("id", loginCode.id)
    .is("consumed_at", null);

  if (consumeError) {
    console.error("telegram login code consume failed", { code: consumeError.code, message: consumeError.message });
    return NextResponse.redirect(loginUrl(request.url, { error: "telegram_code_unavailable" }), 303);
  }

  const token = signSession({
    role: "client",
    accountId: account.id,
    chatId: Number(account.telegram_id),
    email: account.email || undefined,
    name: account.display_name || undefined,
  });

  const response = NextResponse.redirect(new URL("/client", request.url), 303);
  response.cookies.set(sessionCookie, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
