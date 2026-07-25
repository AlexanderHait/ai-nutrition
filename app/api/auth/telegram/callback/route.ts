import crypto from "crypto";
import { NextResponse } from "next/server";
import { sessionCookie, signSession } from "@/lib/auth";

const STATE_COOKIE = "tg_oidc_state";
const VERIFIER_COOKIE = "tg_oidc_verifier";

type TelegramClaims = {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  exp?: number;
  id?: number;
  name?: string;
  given_name?: string;
  preferred_username?: string;
};

function siteUrl(req: Request) {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
}

function decodePart(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

async function verifyIdToken(token: string, clientId: string): Promise<TelegramClaims> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("bad_jwt");

  const header = decodePart(parts[0]);
  const claims = decodePart(parts[1]) as TelegramClaims;

  if (header.alg !== "RS256" || !header.kid) throw new Error("bad_alg");
  if (claims.iss !== "https://oauth.telegram.org") throw new Error("bad_issuer");
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(clientId)) throw new Error("bad_audience");
  if (!claims.exp || claims.exp * 1000 <= Date.now()) throw new Error("expired");

  const jwksRes = await fetch("https://oauth.telegram.org/.well-known/jwks.json", {
    cache: "no-store",
  });
  if (!jwksRes.ok) throw new Error("jwks_failed");
  const jwks = await jwksRes.json() as { keys?: JsonWebKey[] };
  const jwk = jwks.keys?.find((key: any) => key.kid === header.kid);
  if (!jwk) throw new Error("key_not_found");

  const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const signed = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2], "base64url");
  const ok = crypto.verify("RSA-SHA256", signed, key, signature);
  if (!ok) throw new Error("bad_signature");

  return claims;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map(v => v.trim()).filter(Boolean).map(v => {
      const i = v.indexOf("=");
      return [decodeURIComponent(v.slice(0, i)), decodeURIComponent(v.slice(i + 1))];
    })
  );
  const expectedState = cookies[STATE_COOKIE];
  const verifier = cookies[VERIFIER_COOKIE];

  if (error || !code || !returnedState || !expectedState || returnedState !== expectedState || !verifier) {
    return NextResponse.redirect(new URL("/login?error=telegram", req.url));
  }

  const clientId = process.env.TELEGRAM_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=telegram_config", req.url));
  }

  try {
    const redirectUri = `${siteUrl(req)}/api/auth/telegram/callback`;
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenRes = await fetch("https://oauth.telegram.org/token", {
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
        code_verifier: verifier,
      }),
      cache: "no-store",
    });

    if (!tokenRes.ok) throw new Error(`token_${tokenRes.status}`);
    const tokenData = await tokenRes.json() as { id_token?: string };
    if (!tokenData.id_token) throw new Error("missing_id_token");

    const claims = await verifyIdToken(tokenData.id_token, clientId);
    const chatId = Number(claims.id ?? claims.sub);
    if (!Number.isSafeInteger(chatId) || chatId <= 0) throw new Error("bad_user_id");

    const name = claims.given_name || claims.name || claims.preferred_username || "Клиент";
    const res = NextResponse.redirect(new URL("/client", req.url));
    res.cookies.set(sessionCookie, signSession({ role: "client", chatId, name }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    res.cookies.delete(STATE_COOKIE);
    res.cookies.delete(VERIFIER_COOKIE);
    return res;
  } catch (e) {
    console.error("Telegram OIDC callback failed:", e);
    const res = NextResponse.redirect(new URL("/login?error=telegram", req.url));
    res.cookies.delete(STATE_COOKIE);
    res.cookies.delete(VERIFIER_COOKIE);
    return res;
  }
}
