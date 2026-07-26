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

    if (!payload.v || !payload.ts) return null;

    // Authorization flow must be reasonably fresh.
    if (Date.now() - payload.ts > 10 * 60 * 1000) return null;

    return payload;
  } catch {
    return null;
  }
}

function loginError(req: Request, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, req.url));
}

export async function GET(req: Request) {
  const currentUrl = new URL(req.url);
  const code = currentUrl.searchParams.get("code");
  const state = currentUrl.searchParams.get("state");
  const error = currentUrl.searchParams.get("error");

  if (error || !code || !state) {
    return loginError(req, "telegram_callback");
  }

  const clientId = process.env.TELEGRAM_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return loginError(req, "telegram_config");
  }

  // IMPORTANT: no browser cookie is required here.
  // Mobile Telegram may return the user in a different browser context.
  const statePayload = verifyState(state);
  if (!statePayload) {
    return loginError(req, "telegram_state");
  }

  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL || currentUrl.origin
  ).replace(/\/$/, "");
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
    console.error(
      "Telegram token exchange failed",
      tokenResponse.status,
      await tokenResponse.text(),
    );
    return loginError(req, "telegram_token");
  }

  const tokens = (await tokenResponse.json()) as { id_token?: string };
  if (!tokens.id_token) {
    return loginError(req, "telegram_token");
  }

  try {
    const { payload } = await jwtVerify(tokens.id_token, JWKS, {
      issuer: "https://oauth.telegram.org",
      audience: clientId,
    });

    const telegramId = Number(payload.id ?? payload.sub);
    if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
      throw new Error("Telegram ID is missing from ID token");
    }

    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("telegram_id, first_name, username")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return loginError(req, "telegram_unknown");
    }

    // Always return to the canonical site URL. This also prevents www/non-www
    // cookie inconsistencies after mobile authorization.
    const finalOrigin = (
      process.env.NEXT_PUBLIC_SITE_URL || currentUrl.origin
    ).replace(/\/$/, "");
    const res = NextResponse.redirect(new URL("/client", finalOrigin));

    res.cookies.set(
      sessionCookie,
      signSession({
        role: "client",
        chatId: telegramId,
        name: profile.first_name || String(payload.name || ""),
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    );

    return res;
  } catch (e) {
    console.error("Telegram ID token verification failed", e);
    return loginError(req, "telegram_verify");
  }
}
