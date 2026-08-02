import Link from "next/link";
import {
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  ChevronDown,
  Crown,
  ShoppingBasket,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { requireClient } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { subscriptionAccess } from "@/lib/subscription-access";
import SimplifiedSections from "@/components/SimplifiedSections";

export const dynamic = "force-dynamic";

const basicFeatures = [
  "Фото и ручной дневник питания",
  "КБЖУ и остаток на сегодня",
  "История, вес и базовый прогресс",
  "10 фото-анализов и 20 AI-запросов в месяц",
];

const premiumFeatures = [
  "Безлимитные фото-анализы и AI-запросы",
  "Что поесть сегодня с учётом остатка КБЖУ",
  "Почему меняется вес и что на это влияет",
  "План корректировки на следующую неделю",
  "Память о привычных продуктах и предпочтениях",
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
  const premiumPrice = premiumProduct ? Number(premiumProduct.price_rub).toLocaleString("ru-RU") : null;

  return (
    <>
      <SimplifiedSections />
      <div className="pageHead">
        <div><p>Подписка</p><h1>{isPremium ? "TeddY Premium активен" : "Что даст Premium"}</h1><span>Не список технологий, а три понятных результата для питания и веса.</span></div>
      </div>

      {query.payment === "success" ? <div className="successNotice"><CheckCircle2 size={16} />Оплата подтверждена. Подписка активирована.</div> : null}
      {query.payment === "canceled" ? <div className="subscriptionControlError"><XCircle size={16} />Оплата не завершена. Деньги повторно не списывались.</div> : null}
      {["unavailable", "invalid_plan", "order_not_found", "missing_order"].includes(query.payment || "") ? <div className="subscriptionControlError">Оплата пока недоступна. Текущий доступ продолжает работать.</div> : null}
      {query.trial === "started" ? <div className="successNotice"><CheckCircle2 size={16} />Пробный Premium активирован на 3 дня.</div> : null}
      {query.trial === "used" ? <div className="subscriptionControlError">Пробный Premium уже был использован.</div> : null}
      {query.trial === "error" ? <div className="subscriptionControlError">Не удалось активировать пробный Premium.</div> : null}

      <section className="subscriptionLifecycleBar">
        <div>
          <small>Текущий тариф</small>
          <b>{isPremium ? (access.state === "trial" ? "Пробный Premium" : "Premium") : "Basic"}</b>
          <span>{accessEnd ? `до ${new Date(accessEnd).toLocaleDateString("ru-RU")}` : isPremium ? "без указанного срока" : "базовый доступ активен"}</span>
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <span><small>Фото</small><b>{isPremium ? "Безлимит" : `${access.remaining.photo_analysis} из ${access.limits.photo_analysis}`}</b></span>
          <span><small>AI-запросы</small><b>{isPremium ? "Безлимит" : `${access.remaining.ai_request} из ${access.limits.ai_request}`}</b></span>
        </div>
      </section>

      {!isPremium && access.trial_available ? (
        <form action="/api/subscription/lifecycle" method="post" className="trialBanner">
          <div><small>3 дня бесплатно</small><b>Проверить Premium на своих данных</b><span>Без карты и автоматического списания. После пробного периода останется Basic.</span></div>
          <button className="primary" name="action" value="trial">Попробовать 3 дня</button>
        </form>
      ) : null}

      <section className="premiumOutcomeGrid">
        <article className="premiumOutcome">
          <i><UtensilsCrossed size={19} /></i>
          <b>Что поесть сегодня</b>
          <p>TeddY учитывает уже съеденное, остаток калорий и белка и предлагает конкретный следующий приём.</p>
        </article>
        <article className="premiumOutcome">
          <i><ChartNoAxesCombined size={19} /></i>
          <b>Почему меняется вес</b>
          <p>Сопоставляет вес, средние калории и стабильность рациона, а не делает вывод по одному дню.</p>
        </article>
        <article className="premiumOutcome">
          <i><ShoppingBasket size={19} /></i>
          <b>Что исправить дальше</b>
          <p>Даёт один приоритет на день и понятный план корректировки на следующую неделю.</p>
        </article>
      </section>

      <section className="card premiumOffer top">
        <div>
          <h2>{isPremium ? "Персональный нутрициолог уже доступен" : "Оформить TeddY Premium"}</h2>
          <p>{isPremium ? "Открой Coach и получи следующий персональный шаг." : "Полное сопровождение без автоматического списания."}</p>
          {premiumPrice ? <strong>{premiumPrice} ₽ · {premiumProduct?.period_days} дней</strong> : null}
        </div>
        {isPremium ? (
          <Link className="primary planCta" href="/client/coach"><Crown size={16} />Открыть TeddY Coach</Link>
        ) : premiumProduct ? (
          <form action="/client/checkout/premium" method="get">
            <button className="primary planCta" type="submit">Оформить Premium{premiumPrice ? ` за ${premiumPrice} ₽` : ""}</button>
          </form>
        ) : (
          <span className="muted">Тариф временно недоступен</span>
        )}
      </section>

      <details className="secondaryDisclosure top">
        <summary>
          <span><b>Сравнить тарифы подробно</b><small>Лимиты, функции и стоимость</small></span>
          <ChevronDown size={18} />
        </summary>
        <div className="disclosureBody">
          <div className="planCompareGrid">
            <section className="planCompareCard">
              <h3>Basic</h3>
              <p>{basicProduct ? `${Number(basicProduct.price_rub).toLocaleString("ru-RU")} ₽ · ${basicProduct.period_days} дней` : "Базовый доступ"}</p>
              <FeatureList features={basicFeatures} />
            </section>
            <section className="planCompareCard">
              <h3>Premium</h3>
              <p>{premiumPrice ? `${premiumPrice} ₽ · ${premiumProduct?.period_days} дней` : "Полное сопровождение"}</p>
              <FeatureList features={premiumFeatures} />
              {isPremium && premiumProduct ? (
                <form action="/client/checkout/premium" method="get">
                  <button className="secondaryBtn planCta" type="submit">Продлить Premium</button>
                </form>
              ) : null}
            </section>
          </div>
        </div>
      </details>
    </>
  );
}

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul>
      {features.map((feature) => <li key={feature}><Check size={14} /><span>{feature}</span></li>)}
    </ul>
  );
}
