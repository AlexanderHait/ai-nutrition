import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return NextResponse.json({ ok: false, configured: false }, { status: 503 });

  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => null);
  return NextResponse.json(
    { ok: response.ok && payload?.ok === true, configured: true },
    { status: response.ok && payload?.ok === true ? 200 : 502 },
  );
}
