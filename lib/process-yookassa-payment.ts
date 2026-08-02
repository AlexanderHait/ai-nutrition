import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getYooPayment, normalizeYooStatus } from "@/lib/yookassa";

export async function verifyAndProcessYooPayment(paymentId: string) {
  const db = getSupabaseAdmin();
  const { data: order, error: orderError } = await db
    .from("payment_orders")
    .select("id,account_id,chat_id,plan,amount_rub,currency,provider_payment_id,status")
    .eq("provider", "yookassa")
    .eq("provider_payment_id", paymentId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order?.account_id) throw new Error("Payment order not found");

  const payment = await getYooPayment(paymentId);
  const amount = Number(payment.amount?.value);
  const metadata = payment.metadata || {};
  if (
    payment.id !== order.provider_payment_id ||
    !Number.isFinite(amount) ||
    amount !== Number(order.amount_rub) ||
    payment.amount?.currency !== order.currency ||
    String(metadata.order_id || "") !== String(order.id) ||
    String(metadata.account_id || "") !== String(order.account_id) ||
    String(metadata.plan || "") !== String(order.plan) ||
    (order.chat_id && String(metadata.chat_id || "") !== String(order.chat_id))
  ) {
    throw new Error("YooKassa payment does not match the local order");
  }

  const status = normalizeYooStatus(payment.status);
  const { data: result, error: processError } = await db.rpc(
    "process_yookassa_payment",
    { _payment_id: payment.id, _status: status, _payload: payment },
  );
  if (processError) throw processError;
  return { payment, order, status, result };
}
