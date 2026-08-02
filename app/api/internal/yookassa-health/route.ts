import { NextResponse } from "next/server";
import { getYooPayment, yooKassaConfigured, YooKassaError } from "@/lib/yookassa";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!yooKassaConfigured()) {
    return NextResponse.json({ ok: false, configured: false, authenticated: false }, { status: 503 });
  }

  try {
    await getYooPayment("00000000-0000-0000-0000-000000000000");
    return NextResponse.json({ ok: true, configured: true, authenticated: true });
  } catch (error) {
    if (error instanceof YooKassaError && error.status === 404) {
      return NextResponse.json({ ok: true, configured: true, authenticated: true });
    }
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        authenticated: false,
        provider_status: error instanceof YooKassaError ? error.status : null,
      },
      { status: 502 },
    );
  }
}
