import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyAndProcessYooPayment } from "@/lib/process-yookassa-payment";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const auth = await requireClient();
  const { order: orderId } = await searchParams;
  if (!orderId) redirect("/client/plan?payment=missing_order");

  const db = getSupabaseAdmin();
  const { data: order } = await (db.from("payment_orders") as any)
    .select("id,chat_id,plan,amount_rub,status,provider_payment_id,paid_at,created_at")
    .eq("id", orderId)
    .eq("chat_id", Number(auth.chatId))
    .maybeSingle();

  if (!order) redirect("/client/plan?payment=order_not_found");
  if (order.status === "succeeded") redirect("/client/plan?payment=success");
  if (order.status === "canceled" || order.status === "failed") {
    redirect("/client/plan?payment=canceled");
  }

  let status: "pending" | "succeeded" | "canceled" = "pending";
  if (order.provider_payment_id) {
    try {
      const processed = await verifyAndProcessYooPayment(order.provider_payment_id);
      status = processed.status;
    } catch (error) {
      console.error("payment return verification failed", {
        orderId: order.id,
        paymentId: order.provider_payment_id,
        error,
      });
    }
  }

  if (status === "succeeded") redirect("/client/plan?payment=success");
  if (status === "canceled") redirect("/client/plan?payment=canceled");

  const price = Number(order.amount_rub).toLocaleString("ru-RU");
  return (
    <>
      <div className="pageHead">
        <div>
          <p>TeddY / Оплата</p>
          <h1>Проверяем платёж</h1>
          <span>ЮKassa ещё не прислала окончательное подтверждение.</span>
        </div>
      </div>
      <section className="card top" style={{ maxWidth: 720 }}>
        <div className="sectionTitleRow">
          <div>
            <h2><Clock3 size={20} /> Платёж обрабатывается</h2>
            <span className="muted">{order.plan === "premium" ? "Premium" : "Basic"} · {price} ₽</span>
          </div>
        </div>
        <div className="premiumLongText">
          <p><CheckCircle2 size={17} /> После подтверждения доступ включится автоматически.</p>
          <p><XCircle size={17} /> Повторно оплачивать сейчас не нужно.</p>
        </div>
        <div className="subscriptionControlButtons top">
          <Link className="primary" href={`/client/payment/return?order=${encodeURIComponent(order.id)}`}>Проверить статус</Link>
          <Link className="secondaryBtn" href="/client/plan">Вернуться к тарифам</Link>
        </div>
      </section>
    </>
  );
}
