import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Scale,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { requireClient } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { subscriptionAccess } from "@/lib/subscription-access";
import { dayKey, fmt, mealDay, sumMeals, type Meal } from "@/lib/data";
import SimplifiedSections from "@/components/SimplifiedSections";
import MichelinSections from "@/components/MichelinSections";

export const dynamic = "force-dynamic";

type Period = 7 | 30 | 90;
type DayTotal = {
  day: string;
  kcal: number;
  prot: number;
  fat: number;
  carb: number;
  active: boolean;
};

function validPeriod(value: unknown): Period {
  return value === "7" ? 7 : value === "90" ? 90 : 30;
}

function dateFromToday(offset: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

function average(days: DayTotal[], key: "kcal" | "prot" | "fat" | "carb") {
  const active = days.filter((day) => day.active);
  return active.length ? active.reduce((sum, day) => sum + day[key], 0) / active.length : 0;
}

function pluralDays(value: number) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}

function buildDays(meals: Meal[], start: Date, count: number): DayTotal[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const day = dayKey(date);
    const rows = meals.filter((meal) => mealDay(meal) === day);
    const total = sumMeals(rows);
    return { day, ...total, active: rows.length > 0 };
  });
}

function bucketDays(days: DayTotal[], size: number) {
  const result: Array<{ start: string; end: string; value: number; active: number }> = [];
  for (let index = 0; index < days.length; index += size) {
    const chunk = days.slice(index, index + size);
    const active = chunk.filter((day) => day.active);
    result.push({
      start: chunk[0].day,
      end: chunk[chunk.length - 1].day,
      value: active.length ? active.reduce((sum, day) => sum + day.kcal, 0) / active.length : 0,
      active: active.length,
    });
  }
  return result;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await requireClient();
  const query = await searchParams;
  const period = validPeriod(query.period);
  const db = getSupabaseAdmin();
  const loadFrom = dayKey(dateFromToday(-179));

  const [
    { data: settings },
    { data: mealRows },
    { data: weights },
    { data: reports },
    access,
  ] = await Promise.all([
    db.from("client_settings").select("*").eq("account_id", session.accountId!).maybeSingle(),
    db.from("meals")
      .select("id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted")
      .eq("account_id", session.accountId!)
      .eq("deleted", false)
      .gte("eaten_day", loadFrom)
      .order("eaten_at", { ascending: false })
      .limit(10000),
    db.from("weight_logs")
      .select("id,weight_kg,measured_at")
      .eq("account_id", session.accountId!)
      .order("measured_at", { ascending: false })
      .limit(120),
    db.from("premium_weekly_reports")
      .select("id,week_end,content_md,created_at")
      .eq("account_id", session.accountId!)
      .order("week_end", { ascending: false })
      .limit(8),
    subscriptionAccess(session.accountId!),
  ]);

  const meals = (mealRows || []) as Meal[];
  const currentStart = dateFromToday(-(period - 1));
  const previousStart = dateFromToday(-(period * 2 - 1));
  const current = buildDays(meals, currentStart, period);
  const previous = buildDays(meals, previousStart, period);
  const activeDays = current.filter((day) => day.active).length;

  const kcalTarget = Number(settings?.kcal_target || 0);
  const proteinTarget = Number(settings?.protein_target || settings?.protein_target_g || 0);
  const fatTarget = Number(settings?.fat_target || settings?.fat_target_g || 0);
  const carbTarget = Number(settings?.carb_target || settings?.carb_target_g || 0);
  const targetWeight = Number(settings?.target_weight_kg || 0);
  const goal = String(settings?.goal || "");

  const avgKcal = average(current, "kcal");
  const avgProtein = average(current, "prot");
  const avgFat = average(current, "fat");
  const avgCarb = average(current, "carb");
  const previousAvgKcal = average(previous, "kcal");
  const calorieChange = avgKcal && previousAvgKcal ? Math.round(avgKcal - previousAvgKcal) : null;

  const allWeights = weights || [];
  const latestWeight = allWeights[0];
  const periodWeights = allWeights.filter((item: any) => new Date(item.measured_at) >= currentStart);
  const periodOldest = periodWeights[periodWeights.length - 1];
  const weightDelta = latestWeight && periodOldest && latestWeight.id !== periodOldest.id
    ? Number(latestWeight.weight_kg) - Number(periodOldest.weight_kg)
    : null;

  const oldestKnown = allWeights[allWeights.length - 1];
  const startWeight = oldestKnown ? Number(oldestKnown.weight_kg) : 0;
  const currentWeight = latestWeight ? Number(latestWeight.weight_kg) : 0;
  const initialDistance = startWeight > 0 && targetWeight > 0 ? Math.abs(startWeight - targetWeight) : 0;
  const goalProgress = initialDistance > 0
    ? Math.max(0, Math.min(100, Math.round((1 - Math.abs(currentWeight - targetWeight) / initialDistance) * 100)))
    : null;

  const kcalGap = kcalTarget > 0 && avgKcal > 0 ? Math.round(avgKcal - kcalTarget) : null;
  const weightAgainstGoal = weightDelta != null && (
    (goal === "Набор массы" && weightDelta < 0)
    || (goal === "Снижение веса" && weightDelta > 0)
  );

  const conclusion = !activeDays
    ? `За последние ${period} дней нет записей питания. Добавь хотя бы три дня, чтобы увидеть реальную тенденцию.`
    : activeDays < 3
      ? `Есть только ${activeDays} ${pluralDays(activeDays)} с рационом. Пока это предварительная картина — нужно минимум три обычных дня.`
      : [
          kcalGap == null
            ? "Задай цель по калориям, чтобы сравнить рацион с планом."
            : Math.abs(kcalGap) <= kcalTarget * 0.12
              ? `Средняя калорийность рядом с целью: ${fmt(avgKcal)} из ${fmt(kcalTarget)} ккал.`
              : kcalGap < 0
                ? `Средняя калорийность ниже цели примерно на ${fmt(Math.abs(kcalGap))} ккал в день.`
                : `Средняя калорийность выше цели примерно на ${fmt(kcalGap)} ккал в день.`,
          weightDelta == null
            ? "Для оценки результата добавь ещё несколько измерений веса."
            : weightAgainstGoal
              ? `Вес изменился на ${weightDelta > 0 ? "+" : ""}${fmt(weightDelta, 1)} кг — это движение против выбранной цели.`
              : `Вес изменился на ${weightDelta > 0 ? "+" : ""}${fmt(weightDelta, 1)} кг и движется в ожидаемую сторону.`,
        ].join(" ");

  const comparison = calorieChange == null
    ? "Для сравнения с предыдущим периодом пока недостаточно данных."
    : Math.abs(calorieChange) < 100
      ? "Средняя калорийность почти не изменилась."
      : calorieChange > 0
        ? `Средняя калорийность выросла на ${fmt(calorieChange)} ккал.`
        : `Средняя калорийность снизилась на ${fmt(Math.abs(calorieChange))} ккал.`;

  const bucketSize = period === 90 ? 7 : 1;
  const chart = bucketDays(current, bucketSize);
  const maxChart = Math.max(kcalTarget, 1, ...chart.map((item) => item.value));

  return (
    <>
      <SimplifiedSections />
      <MichelinSections />

      <div className="pageHead">
        <div>
          <p>Прогресс</p>
          <h1>Что изменилось</h1>
          <span>Графики и выводы видны сразу. Без технических оценок и скрытых разделов.</span>
        </div>
        <Link className="primary compactBtn" href="/client/profile#weight">Записать вес</Link>
      </div>

      <nav className="periodSwitch" aria-label="Период прогресса">
        {[7, 30, 90].map((value) => (
          <Link
            href={`/client/progress?period=${value}`}
            className={period === value ? "active" : undefined}
            aria-current={period === value ? "page" : undefined}
            key={value}
          >
            {value} дней
          </Link>
        ))}
      </nav>

      <section className="progressNarrative top">
        <i>{weightAgainstGoal ? <TrendingDown size={19} /> : <TrendingUp size={19} />}</i>
        <div>
          <small>Вывод нутрициолога</small>
          <b>{activeDays >= 3 ? "Картина периода" : "Нужно больше данных"}</b>
          <p>{conclusion}</p>
          <span>{comparison}</span>
        </div>
      </section>

      <div className="progressKeyStats">
        <KeyMetric icon={<Scale size={17} />} label="Вес" value={currentWeight ? `${fmt(currentWeight, 1)} кг` : "—"} sub={weightDelta != null ? `${weightDelta > 0 ? "+" : ""}${fmt(weightDelta, 1)} кг за период` : "добавь измерения"} />
        <KeyMetric icon={<Activity size={17} />} label="Средние калории" value={avgKcal ? `${fmt(avgKcal)} ккал` : "—"} sub={kcalTarget ? `цель ${fmt(kcalTarget)} ккал` : "цель не задана"} />
        <KeyMetric icon={<Utensils size={17} />} label="Средний белок" value={avgProtein ? `${fmt(avgProtein, 1)} г` : "—"} sub={proteinTarget ? `${Math.round(avgProtein / proteinTarget * 100)}% от цели` : "цель не задана"} />
      </div>

      {currentWeight > 0 && targetWeight > 0 ? (
        <section className="goalJourney top">
          <div>
            <small>Путь к цели</small>
            <b>{fmt(currentWeight, 1)} кг <ArrowRight size={16} /> {fmt(targetWeight, 1)} кг</b>
            <p>{goalProgress == null ? "Нужно больше измерений для расчёта пути." : `Пройдено около ${goalProgress}% пути от первого доступного измерения.`}</p>
          </div>
          <strong>{goalProgress == null ? "—" : `${goalProgress}%`}</strong>
          <i><em style={{ width: `${goalProgress || 0}%` }} /></i>
        </section>
      ) : null}

      <div className="progressCharts top">
        <section className="card progressChartCard">
          <div className="sectionTitleRow">
            <div><h2>Калории</h2><span className="muted">{period === 90 ? "Среднее по неделям" : "Каждый заполненный день"}</span></div>
            <b className="chartAverage">Ø {avgKcal ? fmt(avgKcal) : "—"}</b>
          </div>
          <div className={`periodBarChart period${period}`}>
            {chart.map((item) => {
              const deviation = kcalTarget > 0 && item.value > 0 ? Math.abs(item.value - kcalTarget) / kcalTarget : null;
              const state = deviation == null ? "empty" : deviation <= 0.12 ? "good" : deviation <= 0.25 ? "medium" : "far";
              const label = period === 90
                ? new Date(item.start + "T12:00:00").toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
                : new Date(item.start + "T12:00:00").toLocaleDateString("ru-RU", { day: "2-digit" });
              return (
                <Link href={`/client/nutrition?day=${item.start}#day-${item.start}`} className="periodBar" key={item.start}>
                  <span>{item.value ? fmt(item.value) : ""}</span>
                  <div>
                    <i className={state} style={{ height: `${Math.max(item.value ? 5 : 2, item.value / maxChart * 100)}%` }} />
                    {kcalTarget > 0 ? <em style={{ bottom: `${Math.min(100, kcalTarget / maxChart * 100)}%` }} /> : null}
                  </div>
                  <small>{label}</small>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="card weightProgressCard">
          <div className="sectionTitleRow"><div><h2>Вес</h2><span className="muted">Направление по измерениям</span></div><Scale size={18} /></div>
          {latestWeight ? (
            <>
              <div className="weightBig"><b>{fmt(latestWeight.weight_kg, 1)}</b><span>кг</span></div>
              <WeightChart weights={allWeights.slice(0, 24)} target={targetWeight} />
              <div className="weightHistory modern">
                {allWeights.slice(0, 5).map((weight: any, index: number) => (
                  <div className="row" key={weight.id}>
                    <span>{new Date(weight.measured_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}</span>
                    <b>{fmt(weight.weight_kg, 1)} кг</b>
                    {index === 0 ? <em>сейчас</em> : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="emptyGuidance"><Scale /><b>Добавь первое измерение</b><span>После двух измерений появится линия, после нескольких — направление тренда.</span></div>
          )}
        </section>
      </div>

      <section className="card top">
        <div className="sectionTitleRow"><div><h2>Средние КБЖУ</h2><span className="muted">Фактические значения не обрезаются по цели</span></div><Utensils size={18} /></div>
        <div className="macroSummaryGrid">
          <MacroCard label="Белок" actual={avgProtein} target={proteinTarget} unit="г" />
          <MacroCard label="Жиры" actual={avgFat} target={fatTarget} unit="г" />
          <MacroCard label="Углеводы" actual={avgCarb} target={carbTarget} unit="г" />
        </div>
      </section>

      {access.premium ? (
        <section className="card top">
          <div className="sectionTitleRow"><div><h2>Недельные разборы</h2><span className="muted">Почему результат изменился и что делать дальше</span></div><Sparkles size={18} /></div>
          <div className="digestTimeline">
            {(reports || []).map((report: any) => (
              <details className="digestItem modern" key={report.id}>
                <summary>
                  <div><b>Неделя до {new Date(report.week_end + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</b><small>Разбор нутрициолога</small></div>
                  <span>Открыть</span>
                </summary>
                <div className="digest">{String(report.content_md || "").replace(/\*\*/g, "")}</div>
              </details>
            ))}
          </div>
          {!reports?.length ? <div className="emptyGuidance"><Sparkles /><b>Первый разбор ещё формируется</b><span>Веди питание минимум три дня — появится первый содержательный вывод.</span></div> : null}
        </section>
      ) : (
        <Link href="/client/plan" className="premiumQuietInvite top">
          <Sparkles size={18} />
          <span><b>Premium объясняет причины изменений</b><small>Недельная стратегия и конкретный план действий.</small></span>
          <strong>Узнать больше →</strong>
        </Link>
      )}

      {!activeDays ? (
        <section className="card emptyGuidance top">
          <Target />
          <b>Пока недостаточно данных</b>
          <span>Добавь питание за три дня и два измерения веса. После этого TeddY покажет первую реальную тенденцию.</span>
        </section>
      ) : null}
    </>
  );
}

function KeyMetric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return <div className="progressKeyStat"><i>{icon}</i><span><small>{label}</small><b>{value}</b><small>{sub}</small></span></div>;
}

function MacroCard({ label, actual, target, unit }: { label: string; actual: number; target: number; unit: string }) {
  const percentage = target > 0 && actual > 0 ? Math.round(actual / target * 100) : null;
  const status = percentage == null ? "цель не задана" : percentage < 85 ? "ниже цели" : percentage <= 115 ? "рядом с целью" : `выше цели на ${percentage - 100}%`;
  return (
    <div className="macroSummaryCard">
      <span>{label}</span>
      <b>{actual > 0 ? `${fmt(actual, 1)} ${unit}` : "—"}</b>
      <small>{target > 0 ? `цель ${fmt(target, 1)} ${unit} · ${percentage}%` : status}</small>
      <em>{status}</em>
    </div>
  );
}

function WeightChart({ weights, target }: { weights: any[]; target: number }) {
  if (weights.length < 2) return <div className="muted" style={{ fontSize: 11, marginBottom: 14 }}>Добавь ещё одно измерение — появится линия тренда.</div>;
  const points = [...weights].reverse();
  const values = points.map((point) => Number(point.weight_kg));
  if (target > 0) values.push(target);
  const min = Math.min(...values) - 0.3;
  const max = Math.max(...values) + 0.3;
  const range = Math.max(0.5, max - min);
  const x = (index: number) => 8 + index / Math.max(1, points.length - 1) * 284;
  const y = (value: number) => 82 - (value - min) / range * 68;
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(Number(point.weight_kg)).toFixed(1)}`).join(" ");
  const targetY = target > 0 ? y(target) : null;
  return (
    <div style={{ margin: "6px 0 16px" }}>
      <svg viewBox="0 0 300 92" role="img" aria-label="График изменения веса" style={{ display: "block", width: "100%", height: 120 }}>
        {targetY != null ? <><line x1="6" x2="294" y1={targetY} y2={targetY} stroke="rgba(224,190,104,.38)" strokeDasharray="5 5" /><text x="292" y={Math.max(10, targetY - 4)} textAnchor="end" fill="#8e908f" fontSize="8">цель {fmt(target, 1)}</text></> : null}
        <path d={path} fill="none" stroke="#d4b45d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => <circle key={point.id} cx={x(index)} cy={y(Number(point.weight_kg))} r={index === points.length - 1 ? 4 : 3} fill={index === points.length - 1 ? "#f7f6f1" : "#d4b45d"} />)}
      </svg>
    </div>
  );
}
