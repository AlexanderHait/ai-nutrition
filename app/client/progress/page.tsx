import Link from "next/link";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  Scale,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { requireClient } from "@/lib/auth";
import { clientProgressAccountData } from "@/lib/account-data";
import { dayKey, fmt, mealDay, mealSessions, sumMeals } from "@/lib/data";
import { coachScore, type CoachScore } from "@/lib/coach-score";
import { subscriptionAccess } from "@/lib/subscription-access";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import CoachScoreCard from "@/components/CoachScoreCard";
import SimplifiedSections from "@/components/SimplifiedSections";

export const dynamic = "force-dynamic";

type ProgressDay = {
  day: string;
  total: { kcal: number; prot: number; fat: number; carb: number };
  sessions: number;
};

function clean(text: string) {
  return String(text || "")
    .replace(/\\([_*`])/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}

function average(days: ProgressDay[], key: keyof ProgressDay["total"]) {
  const complete = days.filter((day) => day.sessions > 0);
  if (!complete.length) return 0;
  return complete.reduce((sum, day) => sum + Number(day.total[key] || 0), 0) / complete.length;
}

function scoreSymmetric(value: number, target: number, tolerance: number, penalty: number) {
  if (!(target > 0)) return null;
  return Math.max(0, Math.min(100, 100 - Math.max(0, Math.abs(value / target - 1) - tolerance) * penalty));
}

function scoreProtein(value: number, target: number) {
  if (!(target > 0)) return null;
  const ratio = value / target;
  if (ratio >= 0.9 && ratio <= 1.3) return 100;
  if (ratio < 0.9) return Math.max(0, 100 - (0.9 - ratio) * 125);
  return Math.max(0, 100 - (ratio - 1.3) * 50);
}

function qualityForDay(day: ProgressDay, settings: any) {
  const metrics = [
    { target: Number(settings?.kcal_target || 0), weight: 45, score: scoreSymmetric(day.total.kcal, Number(settings?.kcal_target || 0), 0.1, 125) },
    { target: Number(settings?.protein_target || 0), weight: 35, score: scoreProtein(day.total.prot, Number(settings?.protein_target || 0)) },
    { target: Number(settings?.fat_target || 0), weight: 10, score: scoreSymmetric(day.total.fat, Number(settings?.fat_target || 0), 0.2, 100) },
    { target: Number(settings?.carb_target || 0), weight: 10, score: scoreSymmetric(day.total.carb, Number(settings?.carb_target || 0), 0.2, 100) },
  ].filter((metric) => metric.target > 0 && metric.score != null);

  if (!metrics.length) return null;
  return metrics.reduce((sum, metric) => sum + Number(metric.score) * metric.weight, 0)
    / metrics.reduce((sum, metric) => sum + metric.weight, 0);
}

function stabilityForDays(days: ProgressDay[]) {
  const complete = days.filter((day) => day.sessions > 0);
  if (!complete.length) return null;
  const logging = complete.length / 7 * 100;
  const values = complete.map((day) => day.total.kcal);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const deviation = values.length < 2 || mean <= 0
    ? 50
    : Math.max(0, Math.min(100, 100 - Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) / mean * 100));
  return Math.round(Math.max(0, Math.min(100, logging * 0.6 + deviation * 0.4)));
}

function localCoachScore(days: ProgressDay[], settings: any): CoachScore | null {
  const current = days.slice(-7);
  const previous = days.slice(0, 7);
  const currentComplete = current.filter((day) => day.sessions > 0);
  const previousComplete = previous.filter((day) => day.sessions > 0);
  const targetCount = ["kcal_target", "protein_target", "fat_target", "carb_target"]
    .filter((key) => Number(settings?.[key] || 0) > 0).length;

  if (!currentComplete.length) return null;

  const currentQualities = currentComplete.map((day) => qualityForDay(day, settings)).filter((value): value is number => value != null);
  const previousQualities = previousComplete.map((day) => qualityForDay(day, settings)).filter((value): value is number => value != null);
  const quality = currentQualities.length ? Math.round(currentQualities.reduce((sum, value) => sum + value, 0) / currentQualities.length) : null;
  const previousQuality = previousQualities.length ? Math.round(previousQualities.reduce((sum, value) => sum + value, 0) / previousQualities.length) : null;
  const stability = stabilityForDays(current);
  const previousStability = stabilityForDays(previous);
  const score = quality == null || stability == null ? null : Math.round((quality * 50 + stability * 30) / 80);
  const previousScore = previousQuality == null || previousStability == null ? null : Math.round((previousQuality * 50 + previousStability * 30) / 80);
  const confidence = Math.round(Math.min(100, currentComplete.length / 7 * 60 + targetCount / 4 * 25));

  return {
    chat_id: 0,
    score,
    nutrition_quality: quality,
    stability,
    recommendation_adherence: null,
    active_days: currentComplete.length,
    period_days: 7,
    recommendation_samples: 0,
    confidence,
    trend: currentComplete.length >= 3 && previousComplete.length >= 3 && score != null && previousScore != null ? score - previousScore : null,
    target_count: targetCount,
    data_status: targetCount === 0 ? "setup_required" : currentComplete.length < 3 ? "preliminary" : currentComplete.length < 5 ? "growing" : "reliable",
    calculated_at: new Date().toISOString(),
  };
}

function pluralDays(value: number) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}

export default async function Page() {
  const session = await requireClient();
  const db = getSupabaseAdmin();
  const scorePromise = session.chatId ? coachScore(session.chatId) : Promise.resolve(null);

  const [data, remoteScore, access, reportsResult] = await Promise.all([
    clientProgressAccountData(session.accountId!),
    scorePromise,
    subscriptionAccess(session.accountId!),
    db.from("premium_weekly_reports")
      .select("id,week_end,content_md,created_at")
      .eq("account_id", session.accountId!)
      .order("week_end", { ascending: false })
      .limit(8),
  ]);

  const settings = data.settings;
  const target = Number(settings?.kcal_target || 0);
  const targetWeight = Number(settings?.target_weight_kg || 0);
  const proteinTarget = Number(settings?.protein_target || 0);
  const fatTarget = Number(settings?.fat_target || 0);
  const carbTarget = Number(settings?.carb_target || 0);

  const days: ProgressDay[] = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    const day = dayKey(date);
    const rows = data.meals.filter((meal: any) => mealDay(meal) === day);
    return { day, total: sumMeals(rows), sessions: mealSessions(rows).length };
  });

  const currentWeek = days.slice(-7);
  const previousWeek = days.slice(0, 7);
  const currentComplete = currentWeek.filter((day) => day.sessions > 0);
  const previousComplete = previousWeek.filter((day) => day.sessions > 0);
  const avgKcal = average(currentWeek, "kcal");
  const previousAvgKcal = average(previousWeek, "kcal");
  const avgProtein = average(currentWeek, "prot");
  const avgFat = average(currentWeek, "fat");
  const avgCarb = average(currentWeek, "carb");
  const adherence = target > 0 && currentComplete.length
    ? Math.round(currentComplete.filter((day) => Math.abs(day.total.kcal - target) <= target * 0.12).length / currentComplete.length * 100)
    : 0;

  const score = remoteScore || localCoachScore(days, settings);
  const weights = [...(data.weights || [])].slice(0, 10);
  const latest = weights[0];
  const previous = weights[1];
  const oldest = weights[weights.length - 1];
  const measurementDelta = latest && previous ? Number(latest.weight_kg) - Number(previous.weight_kg) : null;
  const periodWeightDelta = latest && oldest && latest.id !== oldest.id ? Number(latest.weight_kg) - Number(oldest.weight_kg) : null;
  const maxKcal = Math.max(target, 1, ...days.map((day) => day.total.kcal));
  const premium = access.premium;
  const weeklyReports = reportsResult.data || [];
  const calorieDelta = avgKcal && previousAvgKcal ? Math.round(avgKcal - previousAvgKcal) : null;
  const missingDays = Math.max(0, 3 - currentComplete.length);
  const calorieGap = target > 0 && avgKcal ? Math.round(avgKcal - target) : null;
  const goal = String(settings?.goal || "");

  const narrative = !currentComplete.length
    ? "Пока данных недостаточно. Запиши питание хотя бы за три дня — тогда TeddY сможет отделить случайный день от реальной тенденции."
    : currentComplete.length < 3
      ? `Есть только ${currentComplete.length} ${pluralDays(currentComplete.length)} с рационом. Добавь ещё ${missingDays} ${pluralDays(missingDays)}, чтобы вывод стал надёжнее.`
      : [
          calorieGap == null
            ? "Задай цель по калориям, чтобы сравнить питание с планом."
            : Math.abs(calorieGap) <= target * 0.12
              ? `Средняя калорийность рядом с целью: ${fmt(avgKcal)} из ${fmt(target)} ккал.`
              : calorieGap < 0
                ? `Средняя калорийность ниже цели примерно на ${fmt(Math.abs(calorieGap))} ккал в день.`
                : `Средняя калорийность выше цели примерно на ${fmt(calorieGap)} ккал в день.`,
          periodWeightDelta == null
            ? "Добавь ещё измерения веса, чтобы связать рацион с результатом."
            : goal === "Набор массы"
              ? periodWeightDelta > 0
                ? `Вес движется в сторону цели: +${fmt(periodWeightDelta, 1)} кг.`
                : `Вес снизился на ${fmt(Math.abs(periodWeightDelta), 1)} кг — это против цели набора.`
              : goal === "Снижение веса"
                ? periodWeightDelta < 0
                  ? `Вес движется в сторону цели: ${fmt(periodWeightDelta, 1)} кг.`
                  : `Вес вырос на ${fmt(periodWeightDelta, 1)} кг — стоит проверить средние калории.`
                : `Изменение веса: ${periodWeightDelta > 0 ? "+" : ""}${fmt(periodWeightDelta, 1)} кг.`,
        ].join(" ");

  return (
    <>
      <SimplifiedSections />
      <div className="pageHead"><div><p>Прогресс</p><h1>Что изменилось</h1><span>Сверху только вес, калории, белок и понятный вывод. Подробные графики — ниже.</span></div></div>

      <section className="primaryFocus">
        <i>{calorieDelta != null && calorieDelta > 0 ? <TrendingUp size={19} /> : calorieDelta != null && calorieDelta < 0 ? <TrendingDown size={19} /> : <Activity size={19} />}</i>
        <div>
          <small>Вывод нутрициолога</small>
          <b>{currentComplete.length >= 3 ? "Картина недели" : "Нужно немного больше данных"}</b>
          <p>{narrative}</p>
        </div>
        <Link href="/client/profile">Записать вес</Link>
      </section>

      <div className="progressKeyStats">
        <KeyMetric
          icon={<Scale size={17} />}
          label="Вес"
          value={latest ? `${fmt(latest.weight_kg, 1)} кг` : "—"}
          sub={measurementDelta != null ? `${measurementDelta > 0 ? "+" : ""}${fmt(measurementDelta, 1)} кг к прошлому` : "добавь измерение"}
        />
        <KeyMetric
          icon={<Activity size={17} />}
          label="Средние калории"
          value={avgKcal ? `${fmt(avgKcal)} ккал` : "—"}
          sub={target ? `цель ${fmt(target)} ккал` : "цель не задана"}
        />
        <KeyMetric
          icon={<Utensils size={17} />}
          label="Средний белок"
          value={avgProtein ? `${fmt(avgProtein, 1)} г` : "—"}
          sub={proteinTarget ? `${Math.round(avgProtein / proteinTarget * 100)}% от цели ${fmt(proteinTarget, 1)} г` : "цель не задана"}
        />
      </div>

      <details open className="secondaryDisclosure progressDetails top">
        <summary>
          <span><b>Подробная статистика</b><small>КБЖУ, Coach Score, графики и недельные разборы</small></span>
          <ChevronDown size={18} />
        </summary>
        <div className="disclosureBody">
          <section className="detailSection">
            <div className="progressHeroStats">
              <Metric icon={<CalendarDays />} label="Дней с рационом" value={`${currentComplete.length} / 7`} sub={previousComplete.length ? `прошлая неделя: ${previousComplete.length}` : "за последние 7 дней"} />
              <Metric icon={<Target />} label="Попадание в калории" value={currentComplete.length && target ? `${adherence}%` : "—"} sub="дни в диапазоне ±12%" />
              <Metric icon={measurementDelta !== null && measurementDelta <= 0 ? <TrendingDown /> : <TrendingUp />} label="Последнее изменение веса" value={measurementDelta !== null ? `${measurementDelta > 0 ? "+" : ""}${fmt(measurementDelta, 1)} кг` : "—"} sub="к предыдущему измерению" />
            </div>
          </section>

          <section className="card detailSection">
            <div className="sectionTitleRow"><div><h2>Средние КБЖУ за неделю</h2><span className="muted">Превышение цели показывается полностью</span></div><Utensils size={19} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginTop: 14 }}>
              <MacroCard label="Белок" actual={avgProtein} target={proteinTarget} unit="г" />
              <MacroCard label="Жиры" actual={avgFat} target={fatTarget} unit="г" />
              <MacroCard label="Углеводы" actual={avgCarb} target={carbTarget} unit="г" />
              <MacroCard label="Калории" actual={avgKcal} target={target} unit="ккал" />
            </div>
          </section>

          <div className="detailSection">
            {score ? <CoachScoreCard score={score} /> : (
              <div className="card emptyGuidance"><Sparkles /><b>Coach Score ещё формируется</b><span>Нужно минимум три дня питания и заполненные цели.</span></div>
            )}
          </div>

          <div className="clientProgressGrid detailSection">
            <section className="card progressChartCard">
              <div className="sectionTitleRow"><div><h2>Калории · 14 дней</h2><span className="muted">Нажми на столбец, чтобы открыть день</span></div><b className="chartAverage">Ø {avgKcal ? fmt(avgKcal) : "—"}</b></div>
              <div className="client14Chart">
                {days.map((day) => {
                  const deviation = target > 0 && day.total.kcal > 0 ? Math.abs(day.total.kcal - target) / target : null;
                  const background = deviation == null
                    ? "linear-gradient(180deg,#777,#444)"
                    : deviation <= 0.12
                      ? "linear-gradient(180deg,#efd47f,#a78235)"
                      : deviation <= 0.25
                        ? "linear-gradient(180deg,#d6a768,#8f6331)"
                        : "linear-gradient(180deg,#d17a7a,#713d45)";
                  return (
                    <Link href={`/client/nutrition?day=${day.day}#day-${day.day}`} className="client14Col" key={day.day}>
                      <span>{day.total.kcal ? fmt(day.total.kcal) : ""}</span>
                      <div>
                        <i style={{ height: `${Math.max(3, day.total.kcal / maxKcal * 100)}%`, background }} />
                        {target > 0 && <em style={{ bottom: `${Math.min(100, target / maxKcal * 100)}%` }} />}
                      </div>
                      <small>{new Date(day.day + "T12:00:00").toLocaleDateString("ru-RU", { day: "2-digit" })}</small>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="card weightProgressCard">
              <div className="sectionTitleRow"><div><h2>Вес</h2><span className="muted">Тренд по измерениям</span></div><Scale size={19} /></div>
              {latest ? (
                <>
                  <div className="weightBig"><b>{fmt(latest.weight_kg, 1)}</b><span>кг</span></div>
                  <WeightChart weights={weights} target={targetWeight} />
                  {targetWeight > 0 && <div className="weightGoalLine"><span>До цели</span><b>{fmt(Math.abs(Number(latest.weight_kg) - targetWeight), 1)} кг</b></div>}
                  <div className="weightHistory modern">
                    {weights.slice(0, 6).map((weight: any, index: number) => (
                      <div className="row" key={weight.id}>
                        <span>{new Date(weight.measured_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}</span>
                        <b>{fmt(weight.weight_kg, 1)} кг</b>
                        {index === 0 && <em>сейчас</em>}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="emptyGuidance"><Scale /><b>Добавь первое измерение</b><span>После двух измерений появится линия, после нескольких — направление тренда.</span></div>
              )}
            </section>
          </div>

          {premium ? (
            <section className="card detailSection">
              <div className="sectionTitleRow"><div><h2>Разборы нутрициолога</h2><span className="muted">Объяснение результатов и план следующей недели</span></div><Sparkles size={19} /></div>
              <div className="digestTimeline">
                {weeklyReports.map((report: any) => (
                  <details className="digestItem modern" key={`weekly-${report.id}`}>
                    <summary><div><b>Неделя до {new Date(report.week_end + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</b><small>Недельный разбор</small></div><span>Открыть</span></summary>
                    <div className="digest">{clean(report.content_md)}</div>
                  </details>
                ))}
                {!weeklyReports.length && data.digests.slice(0, 8).map((digest: any) => (
                  <details className="digestItem modern" key={`digest-${digest.id}`}>
                    <summary><div><b>{new Date(digest.for_date + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</b><small>{fmt(digest.kcal)} ккал</small></div><span>Открыть</span></summary>
                    <div className="digest">{clean(digest.summary_md)}</div>
                  </details>
                ))}
              </div>
              {!weeklyReports.length && !data.digests.length && (
                <div className="emptyGuidance"><Sparkles /><b>Первый разбор ещё формируется</b><span>Веди питание минимум три дня — появится первый содержательный вывод.</span></div>
              )}
            </section>
          ) : (
            <Link href="/client/plan" className="premiumProgressTeaser detailSection">
              <Sparkles />
              <span><b>Premium объясняет причины изменений</b><small>Недельная стратегия и конкретный план действий.</small></span>
              <strong>Узнать больше →</strong>
            </Link>
          )}
        </div>
      </details>
    </>
  );
}

function KeyMetric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return <div className="progressKeyStat"><i>{icon}</i><span><small>{label}</small><b>{value}</b><small>{sub}</small></span></div>;
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return <div className="clientMetricCard"><i>{icon}</i><span><small>{label}</small><b>{value}</b><em>{sub}</em></span></div>;
}

function MacroCard({ label, actual, target, unit }: { label: string; actual: number; target: number; unit: string }) {
  const percentage = target > 0 && actual > 0 ? Math.round(actual / target * 100) : null;
  const width = percentage == null ? 0 : Math.min(100, percentage);
  const status = percentage == null
    ? "цель не задана"
    : percentage < 85
      ? "ниже цели"
      : percentage <= 115
        ? "рядом с целью"
        : `выше цели на ${percentage - 100}%`;

  return (
    <div style={{ padding: 14, border: "1px solid #292b30", borderRadius: 12, background: "#0e0f12" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <span style={{ color: "var(--muted)", fontSize: 10 }}>{label}</span>
        <b>{percentage == null ? "—" : `${percentage}%`}</b>
      </div>
      <div style={{ marginTop: 7, fontSize: 18, fontWeight: 800 }}>
        {actual > 0 ? `${fmt(actual, 1)} ${unit}` : "—"}
        {target > 0 ? <small style={{ fontSize: 10, color: "var(--muted)", fontWeight: 400 }}> из {fmt(target, 1)} {unit}</small> : null}
      </div>
      <div style={{ height: 5, borderRadius: 999, background: "#25272c", overflow: "hidden", marginTop: 10 }}>
        <i style={{ display: "block", width: `${width}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#d2aa50,#ecd17d)" }} />
      </div>
      <small style={{ display: "block", color: "var(--muted)", marginTop: 6 }}>{status}</small>
    </div>
  );
}

function WeightChart({ weights, target }: { weights: any[]; target: number }) {
  if (weights.length < 2) {
    return <div style={{ color: "var(--muted)", fontSize: 11, marginBottom: 14 }}>Добавь ещё одно измерение — появится линия тренда.</div>;
  }

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
        {targetY != null ? (
          <>
            <line x1="6" x2="294" y1={targetY} y2={targetY} stroke="rgba(224,190,104,.45)" strokeDasharray="5 5" />
            <text x="292" y={Math.max(10, targetY - 4)} textAnchor="end" fill="#8e908f" fontSize="8">цель {fmt(target, 1)}</text>
          </>
        ) : null}
        <path d={path} fill="none" stroke="#e0be68" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle
            key={point.id}
            cx={x(index)}
            cy={y(Number(point.weight_kg))}
            r={index === points.length - 1 ? 4 : 3}
            fill={index === points.length - 1 ? "#f7f6f1" : "#e0be68"}
          />
        ))}
      </svg>
    </div>
  );
}
