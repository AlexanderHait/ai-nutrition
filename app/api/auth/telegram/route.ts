import crypto from 'crypto';
import { NextResponse } from 'next/server';

const STATE_COOKIE = 'tg_oidc_state';
const VERIFIER_COOKIE = 'tg_oidc_verifier';

function base64url(input: Buffer) {
  return input.toString('base64url');
}

export async function GET(req: Request) {
  const clientId = process.env.TELEGRAM_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/login?error=telegram_config', req.url));
  }

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
  const redirectUri = `${origin}/api/auth/telegram/callback`;

  const state = base64url(crypto.randomBytes(32));
  const verifier = base64url(crypto.randomBytes(48));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());

  const url = new URL('https://oauth.telegram.org/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  const res = NextResponse.redirect(url);
  const secure = process.env.NODE_ENV === 'production';
  const opts = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/', maxAge: 600 };
  res.cookies.set(STATE_COOKIE, state, opts);
  res.cookies.set(VERIFIER_COOKIE, verifier, opts);
  return res;
}
