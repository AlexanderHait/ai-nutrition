import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { sessionCookie, signSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
const NONCE_COOKIE = "tg_login_nonce";
const JWKS = createRemoteJWKSet(new URL("https://oauth.telegram.org/.well-known/jwks.json"));

export async function POST(req: Request) {
  const clientId = process.env.TELEGRAM_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "telegram_config" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as { id_token?: string };
  if (!body.id_token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const store = await cookies();
  const expectedNonce = store.get(NONCE_COOKIE)?.value;
  if (!expectedNonce) return NextResponse.json({ error: "missing_nonce" }, { status: 400 });

  try {
    const { payload } = await jwtVerify(body.id_token, JWKS, {
      issuer: "https://oauth.telegram.org",
      audience: clientId,
    });

    if (payload.nonce !== expectedNonce) {
      return NextResponse.json({ error: "invalid_nonce" }, { status: 401 });
    }

    const telegramId = Number(payload.id ?? payload.sub);
    if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
      return NextResponse.json({ error: "invalid_user" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("telegram_id, first_name, username")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (error) throw error;
    if (!profile) return NextResponse.json({ error: "unknown_user" }, { status: 403 });

    const res = NextResponse.json({ ok: true, redirect: "/client" });
    res.cookies.set(
      sessionCookie,
      signSession({ role: "client", chatId: telegramId, name: profile.first_name || String(payload.name || "") }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    );
    res.cookies.set(NONCE_COOKIE, "", { path: "/", expires: new Date(0), maxAge: 0 });
    return res;
  } catch (error) {
    console.error("Telegram Login Library token verification failed", error);
    return NextResponse.json({ error: "telegram_verify" }, { status: 401 });
  }
}
