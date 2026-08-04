import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import YooKassaWidget from "@/components/YooKassaWidget";
import { requireClient } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OrderMetadata = {
  confirmation_token?: string;
  period_days?: number;
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const current = await requireClient();
  const { order: orderId } = await searchParams;
  if (!orderId) redirect("/client/plan?payment=missing_order");

  const db = getSupabaseAdmin();
  const { data: order } = await db
    .from("payment_orders")
    .select("id,account_id,plan,amount_rub,status,metadata")
    .eq("id", orderId)
    .eq("account_id", current.accountId!)
    .maybeSingle();

  if (!order) redirect("/client/plan?payment=order_not_found");
  if (order.status === "succeeded") redirect("/client/plan?payment=success");
  if (order.status === "canceled" || order.status === "failed") redirect("/client/plan?payment=canceled");

  const metadata = (order.metadata || {}) as OrderMetadata;
  const token = String(metadata.confirmation_token || "");
  if (!token) redirect(`/client/checkout/${order.plan}?error=processing`);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.smartnutrition-ai.ru").replace(/\/$/, "");
  const returnUrl = `${siteUrl}/client/payment/return?order=${encodeURIComponent(order.id)}`;
  const price = Number(order.amount_rub).toLocaleString("ru-RU");
  const title = order.plan === "premium" ? "TeddY Premium" : "TeddY Basic";
  const periodDays = Number(metadata.period_days || 30);

  return (
    <>
      <style>{`
        .teddyPaymentPage{max-width:980px;margin:0 auto;display:grid;gap:18px}
        .teddyPaymentHero{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px;align-items:start}
        .teddyPaymentBrand,.teddyPaymentSummary,.teddyPaymentFormCard{background:var(--surface,#fff);border:1px solid var(--line,#c8d6cf);border-radius:24px;box-shadow:var(--shadow,0 12px 30px rgba(22,55,46,.08))}
        .teddyPaymentBrand{padding:28px;display:grid;gap:22px}
        .teddyPaymentLogo{display:flex;align-items:center;gap:14px}
        .teddyPaymentMark{width:58px;height:58px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(145deg,#f0d574,#cfaa42);color:#11231e;font-weight:900;font-size:19px;box-shadow:0 10px 24px rgba(188,151,49,.22)}
        .teddyPaymentLogo b{font-size:28px;color:var(--text,#173a32);letter-spacing:-.7px}
        .teddyPaymentLogo span{display:block;color:var(--muted,#60766f);font-size:14px;margin-top:2px}
        .teddyPaymentBrand h1{font-size:36px;line-height:1.05;margin:0;color:var(--text,#173a32);letter-spacing:-1.3px}
        .teddyPaymentBrand>p{margin:0;color:var(--body,#294b43);font-size:17px;line-height:1.55}
        .teddyPaymentTrust{display:grid;gap:12px;margin-top:4px}
        .teddyPaymentTrust div{display:flex;gap:10px;align-items:flex-start;color:var(--body,#294b43);font-size:14px;line-height:1.45}
        .teddyPaymentTrust svg{color:#b38b20;flex:none;margin-top:1px}
        .teddyPaymentSummary{padding:24px;position:sticky;top:96px}
        .teddyPaymentSummary small{color:var(--muted,#60766f);text-transform:uppercase;letter-spacing:.16em;font-weight:800}
        .teddyPaymentSummary h2{margin:10px 0 4px;font-size:28px;color:var(--text,#173a32)}
        .teddyPaymentPrice{font-size:42px;font-weight:850;color:var(--text,#173a32);letter-spacing:-1.5px;margin:16px 0 4px}
        .teddyPaymentSummary p{margin:0;color:var(--muted,#60766f)}
        .teddyPaymentDivider{height:1px;background:var(--line,#c8d6cf);margin:22px 0}
        .teddyPaymentTotal{display:flex;justify-content:space-between;gap:12px;font-size:15px;color:var(--body,#294b43)}
        .teddyPaymentTotal b{color:var(--text,#173a32)}
        .teddyPaymentFormCard{padding:22px;overflow:hidden}
        .teddyPaymentFormHead{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:2px 4px 18px}
        .teddyPaymentFormHead h2{margin:0;font-size:22px;color:var(--text,#173a32)}
        .teddyPaymentFormHead span{display:flex;gap:7px;align-items:center;color:var(--muted,#60766f);font-size:13px}
        .teddyYooWidget{min-height:420px;min-width:288px}
        .teddyPaymentLoading{min-height:300px;display:grid;place-items:center;color:var(--muted,#60766f);font-size:14px}
        .teddyPaymentFooter{text-align:center;color:var(--muted,#60766f);font-size:12px;line-height:1.5;padding:0 14px 12px}
        @media(max-width:760px){.teddyPaymentHero{grid-template-columns:1fr}.teddyPaymentSummary{position:static;order:-1}.teddyPaymentBrand{padding:22px}.teddyPaymentBrand h1{font-size:30px}.teddyPaymentMark{width:52px;height:52px}.teddyPaymentLogo b{font-size:25px}.teddyPaymentFormCard{padding:14px 10px;border-radius:20px}.teddyPaymentFormHead{padding:8px 8px 16px;align-items:flex-start;flex-direction:column}.teddyYooWidget{min-height:460px}}
      `}</style>

      <div className="teddyPaymentPage">
        <Link className="back" href="/client/plan">← Назад к тарифам</Link>

        <div className="teddyPaymentHero">
          <section className="teddyPaymentBrand">
            <div className="teddyPaymentLogo">
              <div className="teddyPaymentMark">AI</div>
              <div><b>TeddY</b><span>Персональный AI-нутрициолог</span></div>
            </div>
            <div>
              <h1>Оплата без перехода на безликую страницу</h1>
              <p>Выбери удобный способ и оплати подписку прямо внутри TeddY. Доступ включится автоматически после подтверждения ЮKassa.</p>
            </div>
            <div className="teddyPaymentTrust">
              <div><ShieldCheck size={18} />Платёжные данные обрабатывает ЮKassa — TeddY не получает и не хранит реквизиты карты.</div>
              <div><CheckCircle2 size={18} />Подписка активируется только после подтверждённого платежа.</div>
              <div><LockKeyhole size={18} />Автоматических повторных списаний нет.</div>
            </div>
          </section>

          <aside className="teddyPaymentSummary">
            <small>Ваш заказ</small>
            <h2>{title}</h2>
            <div className="teddyPaymentPrice">{price} ₽</div>
            <p>Доступ на {periodDays} дней</p>
            <div className="teddyPaymentDivider" />
            <div className="teddyPaymentTotal"><span>К оплате</span><b>{price} ₽</b></div>
          </aside>
        </div>

        <section className="teddyPaymentFormCard">
          <div className="teddyPaymentFormHead">
            <h2>Выбери способ оплаты</h2>
            <span><LockKeyhole size={15} />Защищённая форма ЮKassa</span>
          </div>
          <YooKassaWidget token={token} returnUrl={returnUrl} />
        </section>

        <div className="teddyPaymentFooter">Нажимая кнопку оплаты, ты подтверждаешь выбранный тариф, сумму и срок доступа.</div>
      </div>
    </>
  );
}
