import crypto from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const NONCE_COOKIE = "tg_login_nonce";

export async function POST() {
  const clientId = Number(process.env.TELEGRAM_CLIENT_ID);
  if (!Number.isSafeInteger(clientId) || clientId <= 0) {
    return NextResponse.json({ error: "telegram_config" }, { status: 500 });
  }

  const nonce = crypto.randomBytes(32).toString("base64url");
  const res = NextResponse.json({ clientId, nonce });
  res.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
  return res;
}
