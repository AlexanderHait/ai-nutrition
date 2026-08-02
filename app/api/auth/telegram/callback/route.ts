import crypto from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { sessionCookie, signSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const JWKS = createRemoteJWKSet(
  new URL("https://oauth.telegram.org/.well-known/jwks.json"),
);

type StatePayload = {
  v: string;
  ts: number;
  mode?: "link";
  authUserId?: string;
};

function secret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.TELEGRAM_CLIENT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

function verifyState(state: string): StatePayload | null {
  try {
    const key = secret();
    if (!key) return null;
    const [body, sig] = state.split(".");
    if (!body || !sig) return null;
    const expected = crypto
      .createHmac("sha256", key)
      .update(body)
      .digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as StatePayload;
    if (!payload.v || !payload.ts || Date.now() - payload.ts > 10 * 60 * 1000) {
      return null;
    }
    if (payload.mode === "link" && !payload.authUserId) return null;
    return payload;
  } catch {
    return null;
  }
}

function loginError(request: Request, code: string, linkMode = false) {
  return NextResponse.redirect(
    new URL(linkMode ? `/client/profile?telegram=${code}` : `/login?error=${code}`, request.url),
  );
}

export async function GET(request: Request) {
  const currentUrl = new URL(request.url);
  const code = currentUrl.searchParams.get("code");
  const state = currentUrl.searchParams.get("state");
  const callbackError = currentUrl.searchParams.get("error");
  if (callbackError || !code || !state) return loginError(request, "telegram_callback");

  const clientId = process.env.TELEGRAM_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;
  if (!clientId || !clientSecret) return loginError(request, "telegram_config");

  const statePayload = verifyState(state);
  if (!statePayload) return loginError(request, "telegram_state");
  const linkMode = statePayload.mode === "link";

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || currentUrl.origin).replace(/\/$/, "");
  const redirectUri = `${origin}/api/auth/telegram/callback`;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenResponse = await fetch("https://oauth.telegram.org/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: statePayload.v,
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    console.error("Telegram token exchange failed", tokenResponse.status, await tokenResponse.text());
    return loginError(request, "telegram_token", linkMode);
  }

  const tokens = (await tokenResponse.json()) as { id_token?: string };
  if (!tokens.id_token) return loginError(request, "telegram_token", linkMode);

  try {
    const { payload } = await jwtVerify(tokens.id_token, JWKS, {
      issuer: "https://oauth.telegram.org",
      audience: clientId,
    });
    const telegramId = Number(payload.id ?? payload.sub);
    if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
      throw new Error("Telegram ID is missing from ID token");
    }

    const db = getSupabaseAdmin();
    const firstName = String(payload.given_name || payload.name || "").trim();
    const username = String(payload.preferred_username || "").trim();
    const avatarUrl = typeof payload.picture === "string" ? payload.picture : "";

    let accountId: string;
    let profile: { first_name?: string | null } | null = null;
    let redirectPath = "/client";

    if (linkMode) {
      const { data: result, error } = await db.rpc("link_telegram_account_v1", {
        _auth_user_id: statePayload.authUserId,
        _telegram_id: telegramId,
        _first_name: firstName || null,
        _username: username || null,
        _avatar_url: avatarUrl || null,
      });
      if (error || !result?.account_id) {
        console.error("Telegram account linking failed", error);
        return loginError(request, error?.code === "23505" ? "already_linked" : "link_error", true);
      }
      accountId = String(result.account_id);
      redirectPath = "/client/profile?telegram=linked";
      const { data } = await db.from("profiles").select("first_name").eq("account_id", accountId).maybeSingle();
      profile = data;
    } else {
      const { data: account, error } = await db
        .from("customer_accounts")
        .select("id,status")
        .eq("telegram_id", telegramId)
        .maybeSingle();
      if (error) throw error;
      if (!account || account.status !== "active") return loginError(request, "telegram_unknown");
      accountId = account.id;
      const { data } = await db.from("profiles").select("first_name").eq("account_id", accountId).maybeSingle();
      profile = data;
    }

    if (avatarUrl) {
      await db.from("profiles").update({
        avatar_url: avatarUrl,
        avatar_updated_at: new Date().toISOString(),
      }).eq("account_id", accountId);
    }

    const { data: adminRole } = await db
      .from("admin_users")
      .select("is_active")
      .eq("chat_id", telegramId)
      .maybeSingle();
    const loginRole = !linkMode && adminRole?.is_active ? "admin" : "client";
    if (loginRole === "admin") redirectPath = "/admin";

    const response = NextResponse.redirect(new URL(redirectPath, origin));
    response.cookies.set(
      sessionCookie,
      signSession({
        role: loginRole,
        accountId,
        chatId: telegramId,
        authUserId: linkMode ? statePayload.authUserId : undefined,
        name: profile?.first_name || firstName,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    );
    return response;
  } catch (error) {
    console.error("Telegram ID token verification failed", error);
    return loginError(request, "telegram_verify", linkMode);
  }
}
