import Link from "next/link";
import { BrainCircuit, Camera, ChartNoAxesCombined, Check, CheckCircle2, Crown, MessageCircleMore, ShoppingBasket, Sparkles, Target, UtensilsCrossed, XCircle } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { subscriptionAccess } from "@/lib/subscription-access";
import { yooKassaConfigured } from "@/lib/yookassa";

export const dynamic = "force-dynamic";

const basic = [
  "Распознавание еды по фото",
  "Ручной ввод и дневник питания",
  "КБЖУ и сегодняшний остаток",
  "История, вес и базовый прогресс",
  "До 10 фото-анализов в месяц",
  "До 20 AI-запросов в месяц",
];

const premiumFeatures = [
  "Всё из Basic",
  "Безлимитные фото-анализы и AI-запросы",
  "Персональный AI‑нутрициолог",
  "Ежедневный план питания",
  "Рекомендации следующего приёма",
  "Food Memory и анализ привычек",
  "Недельный стратегический разбор",
  "Анализ веса и тренда 7/14 дней",
  "Приоритетная поддержка",
];

type Product = {
  plan: "basic" | "premium";
  price_rub: number;
  period_days: number;
  enabled: boolean;
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; trial?: string }>;
}) {
  const current = await requireClient();
  const query = await searchParams;
  const db = getSupabaseAdmin();
  const paymentReady = yooKassaConfigured();
  const [access, productsResult] = await Promise.all([
    subscriptionAccess(current.accountId!),
    db.from("subscription_products")
      .select("plan,price_rub,period_days,enabled")
      .eq("enabled", true)
      .order("sort_order"),
  ]);

  const products = new Map<string, Product>(
    ((productsResult.data || []) as Product[]).map((product) => [product.plan, product]),
  );
  const basicProduct = products.get("basic");
  const premiumProduct = products.get("premium");
  const isPremium = access.premium;
  const accessEnd = access.trial_ends_at || access.current_period_end;

  return (
    <>
      <div className="pageHead"><div><p>TeddY</p><h1>Выбери уровень сопровождения</h1><span>Basic считает. Premium думает вместе с тобой и помогает действовать.</span></div></div>

      {query.payment === "success" ? <div className="successNotice"><CheckCircle2 size={16} />Оплата подтверждена. Подписка активирована.</div> : null}
      {query.payment === "canceled" ? <div className="subscriptionControlError"><XCircle size={16} />Оплата не завершена. Деньги повторно не списывались.</div> : null}
      {["unavailable", "invalid_plan", "order_not_found", "missing_order"].includes(query.payment || "") ? <div className="subscriptionControlError">Оплата пока недоступна. Текущий доступ продолжает работать.</div> : null}
      {query.trial === "started" ? <div className="successNotice"><CheckCircle2 size={16} />Premium trial активирован на 7 дней.</div> : null}
      {query.trial === "used" ? <div className="subscriptionControlError">Пробный Premium уже был использован.</div> : null}
      {query.trial === "error" ? <div className="subscriptionControlError">Не удалось активировать trial.</div> : null}

      <section className="subscriptionLifecycleBar">
        <div><small>Текущий доступ</small><b>{isPremium ? (access.state === "trial" ? "Premium trial" : "Premium") : "Basic"}</b><span>{accessEnd ? `до ${new Date(accessEnd).toLocaleDateString("ru-RU")}` : isPremium ? "без указанного срока" : "базовый доступ активен"}</span></div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <span><small>Фото в этом месяце</small><b>{isPremium ? "Безлимит" : `${access.remaining.photo_analysis} из ${access.limits.photo_analysis}`}</b></span>
          <span><small>AI-запросы</small><b>{isPremium ? "Безлимит" : `${access.remaining.ai_request} из ${access.limits.ai_request}`}</b></span>
        </div>
      </section>

      {isPremium ? <Link href="/client/coach" className="premiumActiveBanner"><Crown /><span><small>{access.state === "trial" ? "Premium trial активен" : "Premium активен"}</small><b>Открыть персонального нутрициолога</b></span>→</Link> : null}

      {!isPremium && access.trial_available ? (
        <form action="/api/subscription/lifecycle" method="post" className="trialBanner">
          <div><small>7 дней бесплатно</small><b>Попробовать TeddY Premium</b><span>Без оплаты и автоматического списания. После trial останется Basic.</span></div>
          <button className="primary" name="action" value="trial">Начать trial</button>
        </form>
      ) : null}

      <div className="plansGrid premiumComparison top">
        <Plan name="Basic" sub="Трекер питания" desc="Для быстрого и удобного контроля рациона." features={basic} product={basicProduct} paymentReady={paymentReady} active={!isPremium} included={isPremium} openHref="/client/nutrition" openLabel="Открыть трекер" />
        <Plan name="Premium" sub="AI‑нутрициолог" desc="Персональная стратегия и сопровождение каждый день." features={premiumFeatures} product={premiumProduct} paymentReady={paymentReady} active={isPremium} openHref="/client/coach" openLabel="Открыть Premium" premium />
      </div>

      <section className="premiumDifference top">
        <div><Camera /><b>Basic фиксирует</b><span>Что и сколько ты съел.</span></div>
        <div><BrainCircuit /><b>Premium понимает</b><span>Что это значит именно для твоей цели.</span></div>
        <div><Target /><b>Premium корректирует</b><span>Подсказывает следующий шаг и замечает тренды.</span></div>
        <div><MessageCircleMore /><b>Premium сопровождает</b><span>Выходит на связь, когда это полезно.</span></div>
      </section>

      <section className="card top premiumExamples">
        <div className="sectionTitleRow"><div><h2>За что платят в Premium</h2><span className="muted">Экономия решений каждый день</span></div><Sparkles /></div>
        <div>
          <Example icon={<ShoppingBasket />} q="Я в магазине. Что купить?" a="TeddY учитывает остаток белка и калорий и собирает конкретный набор продуктов." />
          <Example icon={<UtensilsCrossed />} q="Что поесть вечером?" a="Учитывает сегодняшний рацион, цель, вес и привычные продукты." />
          <Example icon={<ChartNoAxesCombined />} q="Вес стоит уже две недели" a="Сопоставляет вес и средний рацион и предлагает изменение стратегии." />
        </div>
      </section>
    </>
  );
}

function Plan({ name, sub, desc, features, product, paymentReady, active, included = false, openHref, openLabel, premium }: {
  name: "Basic" | "Premium";
  sub: string;
  desc: string;
  features: string[];
  product?: Product;
  paymentReady: boolean;
  active: boolean;
  included?: boolean;
  openHref: string;
  openLabel: string;
  premium?: boolean;
}) {
  const price = product ? Number(product.price_rub).toLocaleString("ru-RU") : null;
  const checkoutHref = `/client/checkout/${name.toLowerCase()}`;
  return (
    <section className={`planCard ${premium ? "premium" : "basic"}`}>
      {premium ? <em>ПОЛНОЕ СОПРОВОЖДЕНИЕ</em> : null}
      <div className="planCardHead"><i>{premium ? <Crown /> : <Camera />}</i><div><small>{sub}</small><h2>{name}</h2><p>{desc}</p>{price ? <p><b>{price} ₽</b> · {product?.period_days} дней</p> : null}</div></div>
      <div className="planFeatures">{features.map((feature) => <div key={feature}><Check size={15} /><span>{feature}</span></div>)}</div>
      {included ? <Link className="secondaryBtn planCta" href={openHref}>Включено в Premium</Link> : active ? <><Link className={premium ? "primary planCta" : "secondaryBtn planCta"} href={openHref}>{openLabel}</Link>{product && paymentReady ? <Link className="secondaryBtn planCta" href={checkoutHref}>Продлить за {price} ₽</Link> : null}</> : product && paymentReady ? <Link className={premium ? "primary planCta" : "secondaryBtn planCta"} href={checkoutHref}>{premium ? `Подключить Premium за ${price} ₽` : `Подключить Basic за ${price} ₽`}</Link> : <span className="muted">Оплата подключается</span>}
    </section>
  );
}

function Example({ icon, q, a }: { icon: React.ReactNode; q: string; a: string }) {
  return <article><i>{icon}</i><span><b>{q}</b><p>{a}</p></span></article>;
}
