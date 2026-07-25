import crypto from "crypto";
import { NextResponse } from "next/server";

const STATE_COOKIE = "tg_oidc_state";
const VERIFIER_COOKIE = "tg_oidc_verifier";

function base64url(input: Buffer) {
  return input.toString("base64url");
}

function siteUrl(req: Request) {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
}

export async function GET(req: Request) {
  const clientId = process.env.TELEGRAM_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=telegram_config", req.url));
  }

  const state = base64url(crypto.randomBytes(32));
  const verifier = base64url(crypto.randomBytes(48));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  const redirectUri = `${siteUrl(req)}/api/auth/telegram/callback`;

  const auth = new URL("https://oauth.telegram.org/auth");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "openid profile");
  auth.searchParams.set("state", state);
  auth.searchParams.set("code_challenge", challenge);
  auth.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(auth);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set(STATE_COOKIE, state, cookieOptions);
  res.cookies.set(VERIFIER_COOKIE, verifier, cookieOptions);
  return res;
}
