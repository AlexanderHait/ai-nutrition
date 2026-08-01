import { NextResponse } from "next/server";
import { verifyAndProcessYooPayment } from "@/lib/process-yookassa-payment";

const SUPPORTED_EVENTS = new Set(["payment.succeeded", "payment.canceled"]);

export async function POST(request: Request) {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const event = String(payload?.event || "");
  const paymentId = String(payload?.object?.id || "");
  if (!SUPPORTED_EVENTS.has(event)) return NextResponse.json({ ok: true, ignored: true });
  if (!paymentId) {
    return NextResponse.json({ ok: false, error: "missing_payment_id" }, { status: 400 });
  }

  try {
    const processed = await verifyAndProcessYooPayment(paymentId);
    return NextResponse.json({
      ok: true,
      paymentId,
      status: processed.status,
      duplicate: Boolean(processed.result?.duplicate),
    });
  } catch (error) {
    console.error("YooKassa webhook processing failed", { event, paymentId, error });
    return NextResponse.json({ ok: false, error: "processing_failed" }, { status: 500 });
  }
}
