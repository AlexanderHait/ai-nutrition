import crypto from "crypto";
import { NextResponse } from "next/server";

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

function signState(payload: StatePayload) {
  const key = secret();
  if (!key) throw new Error("Missing signing secret");

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function base64url(input: Buffer) {
  return input.toString("base64url");
}

export async function GET(req: Request) {
  const clientId = process.env.TELEGRAM_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=telegram_config", req.url));
  }

  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
  ).replace(/\/$/, "");
  const redirectUri = `${origin}/api/auth/telegram/callback`;

  const verifier = base64url(crypto.randomBytes(48));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest(),
  );

  let state: string;
  try {
    state = signState({ v: verifier, ts: Date.now() });
  } catch {
    return NextResponse.redirect(new URL("/login?error=telegram_config", req.url));
  }

  const url = new URL("https://oauth.telegram.org/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(url);
}
