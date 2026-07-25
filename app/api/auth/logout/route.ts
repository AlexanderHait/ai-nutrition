import { NextResponse } from 'next/server';
import { sessionCookie } from '@/lib/auth';

function logout(req: Request) {
  const res = NextResponse.redirect(new URL('/login', req.url), 303);
  res.cookies.set(sessionCookie, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });
  return res;
}

export async function GET(req: Request) {
  return logout(req);
}

export async function POST(req: Request) {
  return logout(req);
}
