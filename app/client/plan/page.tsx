import Link from "next/link";
import {
  BrainCircuit,
  Camera,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  Crown,
  MessageCircleMore,
  ShoppingBasket,
  Sparkles,
  Target,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { requireClient } from "@/lib/auth";
import { clientProfileData, subscriptionLifecycleData } from "@/lib/data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const basic = [
  "Распознавание еды по фото",
  "Ручной ввод и /day",
  "КБЖУ и дневник питания",
  "Сегодняшний остаток КБЖУ",
  "История и базовый прогресс",
  "Вес и личный профиль",
];

const premiumFeatures = [
  "Всё из Basic",
  "Персональный AI‑нутрициолог",
  "Ежедневный план питания",
  "Рекомендации следующего приёма",
  "Food Memory — знает твои привычные продукты",
  "«Я в магазине / ресторане / нет времени»",
  "Умные подсказки в течение дня",
  "Недельный стратегический разбор",
  "Анализ веса и тренда 7/14 дней",
  "Предложения по корректировке целей",
  "Комментарии после приёмов пищи",
  "Приоритетная поддержка",
];

type Product = {
  plan: "basic" | "premium";
  price_rub: number;
  period_days: number;
  enabled: boolean;
};

function lifecycleIsActive(life: any, plan: "basic" | "premium") {
  return Boolean(
    life?.plan === plan &&
      ["trial", "active", "grace"].includes(String(life?.state || "")) &&
      (!life?.current_period_end ||
        new Date(life.current_period_end) > new Date() ||
        life?.state === "grace"),
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const auth = await requireClient();
  const query = await searchParams;
  const db = getSupabaseAdmin();
  const [data, life, productsResult] = await Promise.all([
    clientProfileData(auth.chatId!),
    subscriptionLifecycleData(auth.chatId!),
    db
      .from("subscription_products")
      .select("plan,price_rub,period_days,enabled")
      .eq("enabled", true)
      .order("sort_order"),
  ]);

  const subscription: any = data.subscription || {};
  const fallbackPremium =
    subscription.status === "active" &&
    subscription.plan === "premium" &&
    (!subscription.ends_at || new Date(subscription.ends_at) > new Date());
  const fallbackBasic =
    subscription.status === "active" &&
    subscription.plan === "basic" &&
    (!subscription.ends_at || new Date(subscription.ends_at) > new Date());

  const isPremium = lifecycleIsActive(life, "premium") || fallbackPremium;
  const isBasic = !isPremium && (lifecycleIsActive(life, "basic") || fallbackBasic);
  const products = new Map<string, Product>(
    ((productsResult.data || []) as Product[]).map((product) => [product.plan, product]),
  );
  const basicProduct = products.get("basic");
  const premiumProduct = products.get("premium");

  return (
    <>
      <div className="pageHead">
        <div>
          <p>TeddY</p>
          <h1>Выбери уровень сопровождения</h1>
          <span>Basic считает. Premium думает вместе с тобой и помогает действовать.</span>
        </div>
      </div>

      {query.payment === "success" ? (
        <div className="successNotice"><CheckCircle2 size={16} />Оплата подтверждена. Подписка активирована.</div>
      ) : null}
      {query.payment === "canceled" ? (
        <div className="subscriptionControlError"><XCircle size={16} />Оплата не завершена. Деньги повторно не списывались.</div>
      ) : null}
      {["unavailable", "invalid_plan", "order_not_found", "missing_order"].includes(query.payment || "") ? (
        <div className="subscriptionControlError">Не удалось открыть платёж. Выбери тариф ещё раз.</div>
      ) : null}

      {life ? (
        <section className="subscriptionLifecycleBar">
          <div>
            <small>Текущий доступ</small>
            <b>{isPremium ? "Premium" : isBasic ? "Basic" : "Без активной подписки"}</b>
            <span>
              {life.current_period_end
                ? `до ${new Date(life.current_period_end).toLocaleDateString("ru-RU")}`
                : "без указанного срока"}
            </span>
          </div>
          {life.provider !== "yookassa" &&
          life.plan === "premium" &&
          ["trial", "active", "grace"].includes(life.state) &&
          !life.cancel_at_period_end ? (
            <form action="/api/subscription/lifecycle" method="post">
              <button className="secondaryBtn" name="action" value="cancel">Отключить автопродление</button>
            </form>
          ) : null}
        </section>
      ) : null}

      {isPremium ? (
        <Link href="/client/coach" className="premiumActiveBanner">
          <Crown />
          <span><small>Premium активен</small><b>Открыть персонального нутрициолога</b></span>
          →
        </Link>
      ) : null}

      {!isPremium && !life ? (
        <form action="/api/subscription/lifecycle" method="post" className="trialBanner">
          <div>
            <small>7 дней</small>
            <b>Попробовать TeddY Premium</b>
            <span>Персональный Coach, планы, рекомендации и недельная стратегия.</span>
          </div>
          <button className="primary" name="action" value="trial">Начать trial</button>
        </form>
      ) : null}

      <div className="plansGrid premiumComparison top">
        <Plan
          name="Basic"
          sub="Трекер питания"
          desc="Для тех, кому нужен быстрый и удобный контроль рациона."
          features={basic}
          product={basicProduct}
          active={isBasic}
          included={isPremium}
          openHref="/client/nutrition"
          openLabel="Открыть трекер"
        />
        <Plan
          name="Premium"
          sub="AI‑нутрициолог"
          desc="Для тех, кто хочет не считать самому, а получать персональную стратегию каждый день."
          features={premiumFeatures}
          product={premiumProduct}
          active={isPremium}
          openHref="/client/coach"
          openLabel="Открыть Premium"
          premium
        />
      </div>

      <section className="premiumDifference top">
        <div><Camera /><b>Basic фиксирует</b><span>Что и сколько ты съел.</span></div>
        <div><BrainCircuit /><b>Premium понимает</b><span>Что это значит именно для твоей цели.</span></div>
        <div><Target /><b>Premium корректирует</b><span>Подсказывает следующий шаг и замечает тренды.</span></div>
        <div><MessageCircleMore /><b>Premium сопровождает</b><span>Сам выходит на связь, когда это действительно полезно.</span></div>
      </section>

      <section className="card top premiumExamples">
        <div className="sectionTitleRow">
          <div><h2>За что платят в Premium</h2><span className="muted">Не дополнительные графики, а экономия решений каждый день</span></div>
          <Sparkles />
        </div>
        <div>
          <Example icon={<ShoppingBasket />} q="Я в SPAR. Что купить?" a="TeddY знает, сколько осталось белка и калорий, и собирает конкретный набор продуктов." />
          <Example icon={<UtensilsCrossed />} q="Что поесть вечером?" a="Учитывает сегодняшний рацион, цель, вес и привычные продукты — а не выдаёт общий совет." />
          <Example icon={<ChartNoAxesCombined />} q="Вес стоит уже две недели" a="Сопоставляет вес и средний рацион и предлагает изменение стратегии, которое ты подтверждаешь сам." />
        </div>
      </section>
    </>
  );
}

function Plan({
  name,
  sub,
  desc,
  features,
  product,
  active,
  included = false,
  openHref,
  openLabel,
  premium,
}: {
  name: "Basic" | "Premium";
  sub: string;
  desc: string;
  features: string[];
  product?: Product;
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
      <div className="planCardHead">
        <i>{premium ? <Crown /> : <Camera />}</i>
        <div>
          <small>{sub}</small>
          <h2>{name}</h2>
          <p>{desc}</p>
          {price ? <p><b>{price} ₽</b> · {product?.period_days} дней</p> : null}
        </div>
      </div>
      <div className="planFeatures">
        {features.map((feature) => <div key={feature}><Check size={15} /><span>{feature}</span></div>)}
      </div>

      {included ? (
        <Link className="secondaryBtn planCta" href={openHref}>Включено в Premium</Link>
      ) : active ? (
        <>
          <Link className={premium ? "primary planCta" : "secondaryBtn planCta"} href={openHref}>{openLabel}</Link>
          {product ? <Link className="secondaryBtn planCta" href={checkoutHref}>Продлить за {price} ₽</Link> : null}
        </>
      ) : product ? (
        <Link className={premium ? "primary planCta" : "secondaryBtn planCta"} href={checkoutHref}>
          {premium ? `Подключить Premium за ${price} ₽` : `Подключить Basic за ${price} ₽`}
        </Link>
      ) : (
        <span className="muted">Оплата временно недоступна</span>
      )}
    </section>
  );
}

function Example({ icon, q, a }: { icon: React.ReactNode; q: string; a: string }) {
  return <article><i>{icon}</i><span><b>{q}</b><p>{a}</p></span></article>;
}
