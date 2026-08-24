import Link from "next/link";
import {
  Brain,
  CheckCircle2,
  Crown,
  Infinity as InfinityIcon,
  Sparkles,
  XCircle,
} from "lucide-react";
import { requireClient } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { subscriptionAccess } from "@/lib/subscription-access";
import SimplifiedSections from "@/components/SimplifiedSections";
import { planCompareCss, PlanCompare, TIERS, tierPromise, type TierKey } from "@/components/PlanCompare";

export const dynamic = "force-dynamic";

type Product = {
  plan: "basic" | "premium";
  price_rub: number;
  period_days: number;
  enabled: boolean;
  photo_limit: number | null;
  ai_request_limit: number | null;
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
      .select("plan,price_rub,period_days,enabled,photo_limit,ai_request_limit")
      .eq("enabled", true)
      .order("sort_order"),
  ]);

  const products = new Map<string, Product>(
    ((productsResult.data || []) as Product[]).map((product) => [product.plan, product]),
  );
  const basicProduct = products.get("basic");
  const premiumProduct = products.get("premium");

  // Лимиты в таблице сравнения — из справочника, а не из вёрстки: она уже
  // однажды устарела, обещая free 3 фото и 5 запросов вместо 10 и 10.
  const freeLimits = await db.rpc("subscription_plan_limits_v1", { _plan: "free" });
  const free = (Array.isArray(freeLimits.data) ? freeLimits.data[0] : freeLimits.data) as
    | { photo_analysis?: number; ai_request?: number }
    | null;
  const planLimits = {
    ...(Number(free?.photo_analysis) > 0 ? { freePhoto: Number(free!.photo_analysis) } : {}),
    ...(Number(free?.ai_request) > 0 ? { freeAi: Number(free!.ai_request) } : {}),
    ...(Number(basicProduct?.photo_limit) > 0 ? { basicPhoto: Number(basicProduct!.photo_limit) } : {}),
    ...(Number(basicProduct?.ai_request_limit) > 0 ? { basicAi: Number(basicProduct!.ai_request_limit) } : {}),
  };

  const tier: TierKey = access.premium ? "premium" : access.plan === "basic" ? "basic" : "free";
  const isTrial = access.premium && access.state === "trial";
  const accessEnd = access.trial_ends_at || access.current_period_end;
  const priceOf = (product?: Product) =>
    product ? Number(product.price_rub).toLocaleString("ru-RU") : null;

  const usageRows = [
    {
      label: "Фото-анализы",
      used: access.usage.photo_analysis,
      limit: access.limits.photo_analysis,
      left: access.remaining.photo_analysis,
    },
    {
      label: "AI-запросы",
      used: access.usage.ai_request,
      limit: access.limits.ai_request,
      left: access.remaining.ai_request,
    },
  ];

  return (
    <>
      <style>{planCompareCss}</style>
      <SimplifiedSections />

      <div className="pageHead">
        <div>
          <p>Подписка</p>
          <h1>{tier === "premium" ? "Premium активен" : tier === "basic" ? "Твой тариф — Basic" : "Ты на бесплатном уровне"}</h1>
          <span>
            {tier === "premium"
              ? "Всё открыто. Ниже — что именно ты используешь."
              : "Ниже видно, что уже доступно и что добавит каждый тариф."}
          </span>
        </div>
      </div>

      {query.payment === "success" ? <div className="successNotice"><CheckCircle2 size={16} />Оплата подтверждена. Подписка активирована.</div> : null}
      {query.payment === "canceled" ? <div className="subscriptionControlError"><XCircle size={16} />Оплата не завершена. Деньги повторно не списывались.</div> : null}
      {["unavailable", "invalid_plan", "order", "order_not_found", "missing_order", "provider", "processing"].includes(query.payment || "") ? <div className="subscriptionControlError">Оплата пока недоступна. Текущий доступ продолжает работать.</div> : null}
      {query.trial === "started" ? <div className="successNotice"><CheckCircle2 size={16} />Пробный Premium активирован на 3 дня.</div> : null}
      {query.trial === "used" ? <div className="subscriptionControlError">Пробный Premium уже был использован.</div> : null}
      {query.trial === "error" ? <div className="subscriptionControlError">Не удалось активировать пробный Premium.</div> : null}

      {/* Текущее состояние: тариф и остаток лимитов полосами, а не текстом */}
      <section className={`planStatus tier-${tier}`}>
        <div className="planStatusHead">
          <span className="planStatusBadge">
            {tier === "premium" ? <Crown size={14} /> : tier === "basic" ? <Sparkles size={14} /> : <Brain size={14} />}
            {isTrial ? "Пробный Premium" : TIERS[tier].name}
          </span>
          <b>{tierPromise(tier, planLimits)}</b>
          <span className="planStatusWhen">
            {accessEnd
              ? `Действует до ${new Date(accessEnd).toLocaleDateString("ru-RU")}`
              : tier === "premium"
                ? "Без указанного срока"
                : "Лимиты обновляются 1-го числа"}
          </span>
        </div>

        <div className="planStatusMeters">
          {usageRows.map((row) => {
            const unlimited = row.limit === null;
            const pct = unlimited || !row.limit ? 100 : Math.min(100, Math.round((row.used / row.limit) * 100));
            const low = !unlimited && row.left !== null && row.left <= 1;
            return (
              <div className="planMeter" key={row.label}>
                <span className="planMeterTop">
                  <small>{row.label}</small>
                  <b>{unlimited ? <><InfinityIcon size={13} /> без лимита</> : `${row.left} из ${row.limit}`}</b>
                </span>
                <i className={`planMeterTrack${low ? " low" : ""}${unlimited ? " unlimited" : ""}`}>
                  <em style={{ width: `${unlimited ? 100 : pct}%` }} />
                </i>
              </div>
            );
          })}
        </div>
      </section>

      {tier !== "premium" && access.trial_available ? (
        <form action="/api/subscription/lifecycle" method="post" className="trialCta">
          <div>
            <small>3 дня бесплатно</small>
            <b>Посмотри Premium на своих данных</b>
            <span>Без карты и без автосписания. Дальше вернёшься на текущий тариф.</span>
          </div>
          <button className="primary shimmer" name="action" value="trial">Попробовать 3 дня</button>
        </form>
      ) : null}

      {/* Наглядное сравнение: у каждой возможности видно, насколько она раскрыта */}
      <PlanCompare
        current={tier}
        basicPrice={priceOf(basicProduct)}
        premiumPrice={priceOf(premiumProduct)}
        basicDays={basicProduct?.period_days ?? null}
        premiumDays={premiumProduct?.period_days ?? null}
        limits={planLimits}
      />

      {tier === "premium" ? (
        <section className="card planFinalCta top">
          <div>
            <h2>Coach уже ждёт</h2>
            <p>Открой персональный разбор и следующий шаг на сегодня.</p>
          </div>
          <Link className="primary planCta shimmer" href="/client/coach"><Crown size={16} />Открыть TeddY Coach</Link>
        </section>
      ) : null}
    </>
  );
}
