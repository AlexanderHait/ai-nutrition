import { cookies } from 'next/headers';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import { sessionCookie, signSession } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const STATE_COOKIE = 'tg_oidc_state';
const VERIFIER_COOKIE = 'tg_oidc_verifier';
const JWKS = createRemoteJWKSet(new URL('https://oauth.telegram.org/.well-known/jwks.json'));

function clearTemporaryCookies(res: NextResponse) {
  for (const name of [STATE_COOKIE, VERIFIER_COOKIE]) {
    res.cookies.set(name, '', { path: '/', expires: new Date(0), maxAge: 0 });
  }
}

export async function GET(req: Request) {
  const currentUrl = new URL(req.url);
  const code = currentUrl.searchParams.get('code');
  const state = currentUrl.searchParams.get('state');
  const error = currentUrl.searchParams.get('error');

  if (error || !code || !state) {
    return NextResponse.redirect(new URL('/login?error=telegram', req.url));
  }

  const clientId = process.env.TELEGRAM_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=telegram_config', req.url));
  }

  const store = await cookies();
  const expectedState = store.get(STATE_COOKIE)?.value;
  const verifier = store.get(VERIFIER_COOKIE)?.value;
  if (!expectedState || !verifier || state !== expectedState) {
    return NextResponse.redirect(new URL('/login?error=telegram_state', req.url));
  }

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || currentUrl.origin).replace(/\/$/, '');
  const redirectUri = `${origin}/api/auth/telegram/callback`;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenResponse = await fetch('https://oauth.telegram.org/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
    cache: 'no-store',
  });

  if (!tokenResponse.ok) {
    console.error('Telegram token exchange failed', tokenResponse.status, await tokenResponse.text());
    return NextResponse.redirect(new URL('/login?error=telegram_token', req.url));
  }

  const tokens = (await tokenResponse.json()) as { id_token?: string };
  if (!tokens.id_token) {
    return NextResponse.redirect(new URL('/login?error=telegram_token', req.url));
  }

  try {
    const { payload } = await jwtVerify(tokens.id_token, JWKS, {
      issuer: 'https://oauth.telegram.org',
      audience: clientId,
    });

    const telegramId = Number(payload.id ?? payload.sub);
    if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
      throw new Error('Telegram ID is missing from ID token');
    }

    // Кабинет доступен только пользователям, уже известным нашему боту.
    const supabase = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('telegram_id, first_name, username')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      const unknown = NextResponse.redirect(new URL('/login?error=telegram_unknown', req.url));
      clearTemporaryCookies(unknown);
      return unknown;
    }

    const res = NextResponse.redirect(new URL('/client', req.url));
    res.cookies.set(
      sessionCookie,
      signSession({ role: 'client', chatId: telegramId, name: profile.first_name || String(payload.name || '') }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      },
    );
    clearTemporaryCookies(res);
    return res;
  } catch (e) {
    console.error('Telegram ID token verification failed', e);
    return NextResponse.redirect(new URL('/login?error=telegram_verify', req.url));
  }
}
