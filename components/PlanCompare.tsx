import Link from "next/link";

export type TierKey = "free" | "basic" | "premium";

export const TIERS: Record<TierKey, { name: string; promise: string }> = {
  free: { name: "Бесплатно", promise: "Ведёшь дневник и видишь КБЖУ" },
  basic: { name: "Basic", promise: "Дневник без экономии: 40 фото в месяц" },
  premium: { name: "Premium", promise: "Личный нутрициолог, который ведёт тебя к цели" },
};

// level: 0 — нет, 1 — ограниченно, 2 — свободно, 3 — без границ.
// Уровень рисуется полосой, поэтому разницу видно, а не вычитываешь из текста.
type Row = {
  group: string;
  label: string;
  hint?: string;
  free: [number, string];
  basic: [number, string];
  premium: [number, string];
};

const ROWS: readonly Row[] = [
  {
    group: "Учёт питания",
    label: "Дневник: фото, текст, чек",
    hint: "Записывай как удобно",
    free: [2, "Есть"],
    basic: [2, "Есть"],
    premium: [3, "Есть"],
  },
  {
    group: "Учёт питания",
    label: "Фото-анализы в месяц",
    hint: "Распознавание блюда по снимку",
    free: [1, "3"],
    basic: [3, "40"],
    premium: [3, "Без лимита"],
  },
  {
    group: "Учёт питания",
    label: "AI-запросы в месяц",
    hint: "Вопросы про еду и питание",
    free: [1, "5"],
    basic: [2, "20"],
    premium: [3, "Без лимита"],
  },
  {
    group: "Учёт питания",
    label: "КБЖУ и остаток на день",
    free: [2, "Есть"],
    basic: [2, "Есть"],
    premium: [3, "Есть"],
  },
  {
    group: "Прогресс",
    label: "История и графики веса",
    free: [1, "7 дней"],
    basic: [2, "Вся история"],
    premium: [3, "Вся история"],
  },
  {
    group: "Прогресс",
    label: "Оценка качества питания",
    hint: "Coach Score 0–100",
    free: [0, "—"],
    basic: [1, "Оценка"],
    premium: [3, "Оценка и разбор"],
  },
  {
    group: "Личный коуч",
    label: "Что поесть сегодня",
    hint: "С учётом того, что уже съедено",
    free: [0, "—"],
    basic: [0, "—"],
    premium: [3, "Каждый день"],
  },
  {
    group: "Личный коуч",
    label: "Почему меняется вес",
    hint: "Связь веса, калорий и стабильности",
    free: [0, "—"],
    basic: [0, "—"],
    premium: [3, "Есть"],
  },
  {
    group: "Личный коуч",
    label: "Недельный разбор и план",
    free: [0, "—"],
    basic: [0, "—"],
    premium: [3, "Каждую неделю"],
  },
  {
    group: "Личный коуч",
    label: "Прогноз достижения цели",
    free: [0, "—"],
    basic: [0, "—"],
    premium: [3, "Есть"],
  },
  {
    group: "Личный коуч",
    label: "Память о твоих продуктах",
    hint: "Не спрашивает одно и то же дважды",
    free: [0, "—"],
    basic: [1, "Частично"],
    premium: [3, "Полная"],
  },
];

function Level({ tier, level, text }: { tier: TierKey; level: number; text: string }) {
  return (
    <div className={`lvl tier-${tier}${level === 0 ? " off" : ""}`}>
      <i aria-hidden>
        {[1, 2, 3].map((step) => (
          <em key={step} className={step <= level ? "on" : undefined} />
        ))}
      </i>
      <span>{text}</span>
    </div>
  );
}

export function PlanCompare({
  current,
  basicPrice,
  premiumPrice,
  basicDays,
  premiumDays,
}: {
  current: TierKey;
  basicPrice: string | null;
  premiumPrice: string | null;
  basicDays: number | null;
  premiumDays: number | null;
}) {
  const groups = Array.from(new Set(ROWS.map((row) => row.group)));

  return (
    <section className="planCompare top">
      <header className="planCompareHead">
        {(["free", "basic", "premium"] as TierKey[]).map((tier) => {
          const isCurrent = tier === current;
          const price =
            tier === "free" ? "0 ₽" : tier === "basic" ? (basicPrice ? `${basicPrice} ₽` : "—") : premiumPrice ? `${premiumPrice} ₽` : "—";
          const days = tier === "basic" ? basicDays : tier === "premium" ? premiumDays : null;
          return (
            <div className={`planCol tier-${tier}${isCurrent ? " current" : ""}`} key={tier}>
              {tier === "premium" ? <span className="planColTag">Максимум пользы</span> : null}
              <b>{TIERS[tier].name}</b>
              <strong>{price}{days ? <small> / {days} дней</small> : null}</strong>
              <p>{TIERS[tier].promise}</p>
              {isCurrent ? (
                <span className="planColCurrent">Твой тариф</span>
              ) : tier === "free" ? (
                <span className="planColCurrent muted">Доступно всем</span>
              ) : (
                <Link className={`planColBtn${tier === "premium" ? " shimmer" : ""}`} href={`/client/checkout/${tier}`}>
                  Оформить
                </Link>
              )}
            </div>
          );
        })}
      </header>

      {groups.map((group) => (
        <div className="planGroup" key={group}>
          <h3>{group}</h3>
          {ROWS.filter((row) => row.group === group).map((row) => (
            <div className="planRow" key={row.label}>
              <div className="planRowName">
                <b>{row.label}</b>
                {row.hint ? <small>{row.hint}</small> : null}
              </div>
              <div className="planRowCells">
                <Level tier="free" level={row.free[0]} text={row.free[1]} />
                <Level tier="basic" level={row.basic[0]} text={row.basic[1]} />
                <Level tier="premium" level={row.premium[0]} text={row.premium[1]} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

export const planCompareCss = String.raw`
:root{
  --tier-free:#8a9099;
  --tier-basic:#5cb0c4;
  --tier-premium:#d8b85f;
  --tier-premium-2:#a08ad0;
}

/* Текущий тариф и остаток лимитов */
.planStatus{margin-top:11px;padding:17px 18px;border:1px solid #26282d;border-radius:16px;background:linear-gradient(135deg,#111216,#0d0e11)}
.planStatus.tier-basic{border-color:#28454c;background:linear-gradient(135deg,#0f1719,#0d0e11)}
.planStatus.tier-premium{border-color:#453c22;background:linear-gradient(135deg,#16130d,#0d0e11)}
.planStatusHead{display:grid;gap:5px}
.planStatusBadge{display:inline-flex;align-items:center;gap:6px;justify-self:start;padding:4px 10px;border-radius:999px;font-size:13px;font-weight:800;letter-spacing:.04em;border:1px solid #2c2f35;background:#0c0d10;color:var(--tier-free)}
.planStatus.tier-basic .planStatusBadge{border-color:#2a4d55;color:var(--tier-basic)}
.planStatus.tier-premium .planStatusBadge{border-color:#4a4025;color:var(--tier-premium)}
.planStatusHead>b{font-size:18px;letter-spacing:-.3px}
.planStatusWhen{font-size:12.5px;color:#7d817e}
.planStatusMeters{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:15px}
.planMeter{display:grid;gap:6px}
.planMeterTop{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.planMeterTop small{font-size:13px;color:#83867f;text-transform:uppercase;letter-spacing:.08em}
.planMeterTop b{display:inline-flex;align-items:center;gap:4px;font-size:13px}
.planMeterTrack{display:block;height:6px;border-radius:99px;background:#1c1e23;overflow:hidden}
.planMeterTrack em{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--tier-basic),#7fd0c4)}
.planMeterTrack.low em{background:linear-gradient(90deg,#c9705f,#e0a06a)}
.planMeterTrack.unlimited em{background:linear-gradient(90deg,var(--tier-premium),var(--tier-premium-2))}

/* Пробный период */
.trialCta{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:10px;padding:16px 18px;border:1px solid #3c3722;border-radius:16px;background:linear-gradient(120deg,#15130d,#100f0c)}
.trialCta>div{display:grid;gap:3px}
.trialCta small{font-size:13px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--tier-premium)}
.trialCta b{font-size:16px}
.trialCta span{font-size:13px;color:#858884}

/* Сравнение тарифов */
.planCompare{border:1px solid #24262b;border-radius:17px;background:#0e0f12;overflow:hidden}
.planCompareHead{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:#1e2025}
.planCol{position:relative;display:grid;gap:5px;align-content:start;padding:17px 15px 15px;background:#111216}
.planCol.tier-premium{background:linear-gradient(160deg,#16130d,#111216)}
.planCol.current{box-shadow:inset 0 2px 0 currentColor}
.planCol.tier-free{color:var(--tier-free)}
.planCol.tier-basic{color:var(--tier-basic)}
.planCol.tier-premium{color:var(--tier-premium)}
.planColTag{position:absolute;top:0;right:0;padding:4px 10px;border-bottom-left-radius:9px;background:linear-gradient(90deg,var(--tier-premium),var(--tier-premium-2));color:#14120c;font-size:11px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
.planCol>b{font-size:13px;font-weight:800;letter-spacing:.03em}
.planCol>strong{color:#f2f2ee;font-size:20px;letter-spacing:-.5px}
.planCol>strong small{color:#797c78;font-size:13px;font-weight:600;letter-spacing:0}
.planCol>p{min-height:32px;margin:0;color:#848783;font-size:12.5px;line-height:1.35}
.planColCurrent{margin-top:4px;font-size:12.5px;font-weight:700}
.planColCurrent.muted{color:#6f726f!important}
.planColBtn{margin-top:4px;display:grid;place-items:center;min-height:34px;border-radius:10px;font-size:13px;font-weight:800;color:#12130f;background:currentColor}
.planColBtn:hover{filter:brightness(1.08)}
.planCol.tier-basic .planColBtn{color:#0d1416;background:var(--tier-basic)}
.planCol.tier-premium .planColBtn{color:#14120c;background:linear-gradient(90deg,var(--tier-premium),var(--tier-premium-2))}

.planGroup{padding:13px 15px 4px;border-top:1px solid #1e2025}
.planGroup h3{margin:0 0 8px;font-size:12.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:#5f6361}
.planRow{display:grid;grid-template-columns:minmax(0,1fr);gap:7px;padding:9px 0;border-bottom:1px solid #191b1f}
.planRow:last-child{border-bottom:0}
.planRowName{display:grid;gap:1px}
.planRowName b{font-size:13.5px;font-weight:650}
.planRowName small{font-size:13px;color:#747774}
.planRowCells{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.lvl{display:grid;gap:5px}
.lvl i{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}
.lvl em{display:block;height:4px;border-radius:99px;background:#212429}
.lvl.tier-free em.on{background:var(--tier-free)}
.lvl.tier-basic em.on{background:var(--tier-basic)}
.lvl.tier-premium em.on{background:linear-gradient(90deg,var(--tier-premium),var(--tier-premium-2))}
.lvl span{font-size:12.5px;color:#9a9d99}
.lvl.off span{color:#5a5d5b}

.planFinalCta{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.planFinalCta h2{margin:0 0 3px;font-size:17px}
.planFinalCta p{margin:0;color:#858884;font-size:13px}

@media(max-width:760px){
  .planStatusMeters{grid-template-columns:1fr}
  .planCompareHead{grid-template-columns:1fr;gap:1px}
  .planCol>p{min-height:0}
  .planRowCells{gap:7px}
  .lvl span{font-size:12.5px}
  .planColTag{border-bottom-left-radius:0;border-top-right-radius:0}
}
`;
