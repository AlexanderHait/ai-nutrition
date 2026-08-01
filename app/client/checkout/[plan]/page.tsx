import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  terms: "Подтверди выбранный тариф и сумму.",
  email: "Проверь адрес электронной почты.",
  email_required: "Для формирования чека нужен адрес электронной почты.",
  unavailable: "Этот тариф временно недоступен.",
  order: "Не удалось создать заказ. Попробуй ещё раз.",
  provider: "Не удалось перейти к оплате. Проверь настройки ЮKassa или попробуй ещё раз.",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ plan: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireClient();
  const { plan } = await params;
  const query = await searchParams;
  if (plan !== "basic" && plan !== "premium") redirect("/client/plan");

  const db = getSupabaseAdmin();
  const { data: product } = await db
    .from("subscription_products")
    .select("plan,title,description,price_rub,period_days,enabled")
    .eq("plan", plan)
    .eq("enabled", true)
    .maybeSingle();
  if (!product) redirect("/client/plan?payment=unavailable");

  const price = Number(product.price_rub).toLocaleString("ru-RU");
  const error = query.error ? ERRORS[query.error] : null;

  return (
    <>
      <Link className="back" href="/client/plan">← Назад к тарифам</Link>
      <div className="pageHead">
        <div>
          <p>TeddY / Оплата</p>
          <h1>{product.title}</h1>
          <span>{product.description}</span>
        </div>
      </div>

      <section className="card top" style={{ maxWidth: 720 }}>
        <div className="sectionTitleRow">
          <div>
            <h2>{price} ₽</h2>
            <span className="muted">Доступ на {product.period_days} дней · без автоматического списания</span>
          </div>
          <CreditCard />
        </div>

        <div className="premiumLongText">
          <p><ShieldCheck size={17} /> Оплата проходит на защищённой странице ЮKassa.</p>
          <p><CheckCircle2 size={17} /> Тариф включится только после подтверждения оплаты.</p>
          <p><CheckCircle2 size={17} /> Продлить доступ можно заранее — оставшиеся дни сохранятся.</p>
        </div>

        {error ? <div className="subscriptionControlError top">{error}</div> : null}

        <form action="/api/payments/yookassa/create" method="post" className="checkinForm top">
          <input type="hidden" name="plan" value={plan} />
          <label>
            Электронная почта для чека
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="name@example.com"
              required
            />
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <input type="checkbox" name="accept_terms" required style={{ width: 18, marginTop: 3 }} />
            <span>Подтверждаю тариф {product.title}, сумму {price} ₽ и срок доступа {product.period_days} дней.</span>
          </label>
          <button className="primary" type="submit">Перейти к оплате {price} ₽</button>
        </form>
      </section>
    </>
  );
}
