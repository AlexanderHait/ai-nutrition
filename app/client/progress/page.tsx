import { requireClient } from "@/lib/auth";
import { clientData, fmt, sumMeals } from "@/lib/data";
import Link from "next/link";

export const dynamic = "force-dynamic";

function cleanTelegramMarkdown(text: string) {
  return String(text || "")
    .replace(/\\([_*`])/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}

export default async function Page() {
  const s = await requireClient();
  const d = await clientData(s.chatId!);
  const kcalTarget = Number(d.settings?.kcal_target || 2000);

  const grouped = new Map<string, typeof d.meals>();
  for (const m of d.meals) {
    if (!grouped.has(m.eaten_day)) grouped.set(m.eaten_day, []);
    grouped.get(m.eaten_day)!.push(m);
  }

  const days = [...grouped.entries()].slice(0, 7).map(([day, meals]) => ({
    day,
    total: sumMeals(meals),
  }));
  const completeDays = days.filter((x) => x.total.kcal > 0);
  const avgKcal = completeDays.length
    ? completeDays.reduce((a, x) => a + x.total.kcal, 0) / completeDays.length
    : 0;

  const latestWeight = d.weights?.[0];
  const previousWeight = d.weights?.[1];
  const weightDelta =
    latestWeight && previousWeight
      ? Number(latestWeight.weight_kg) - Number(previousWeight.weight_kg)
      : null;
  const targetWeight = Number(d.settings?.target_weight_kg || 0);

  return (
    <>
      <div className="pageHead">
        <div>
          <p>Динамика</p>
          <h1>Прогресс</h1>
          <span>Калории, вес и ежедневные рекомендации</span>
        </div>
      </div>

      <div className="progressSummary">
        <Summary l="Средние ккал" v={completeDays.length ? `${fmt(avgKcal)} ккал` : "—"} s={`цель ${fmt(kcalTarget)} ккал`} />
        <Summary l="Дней с рационом" v={`${completeDays.length} / 7`} s="за последние 7 дней" />
        <Summary
          l="Вес"
          v={latestWeight ? `${fmt(latestWeight.weight_kg, 1)} кг` : "—"}
          s={targetWeight ? `цель ${fmt(targetWeight, 1)} кг` : "цель не задана"}
        />
      </div>

      <div className="grid2 top">
        <section className="card">
          <h2>Калории · 7 дней</h2>
          {days.length ? (
            <div className="progressDays">
              {days.map((x) => {
                const pct = kcalTarget ? Math.min(130, (x.total.kcal / kcalTarget) * 100) : 0;
                const delta = x.total.kcal - kcalTarget;
                return (
                  <Link
                    className="progressDay progressDayLink"
                    href={`/client/nutrition?day=${x.day}#day-${x.day}`}
                    key={x.day}
                    title="Открыть питание за этот день"
                  >
                    <div>
                      <span>{new Date(x.day + "T12:00:00").toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}</span>
                      <b>{fmt(x.total.kcal)} ккал</b>
                    </div>
                    <div className="goalProgress">
                      <i style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <small className={Math.abs(delta) <= kcalTarget * 0.1 ? "onTarget" : ""}>
                      {delta === 0 ? "точно по цели" : delta > 0 ? `+${fmt(delta)}` : `${fmt(delta)}`} ккал
                      <span className="progressOpen">Открыть →</span>
                    </small>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="muted">Пока недостаточно данных.</p>
          )}
        </section>

        <section className="card">
          <h2>Вес</h2>
          {latestWeight ? (
            <>
              <div className="weightValue">{fmt(latestWeight.weight_kg, 1)} кг</div>
              {weightDelta !== null && (
                <p className="muted">
                  С прошлого измерения: {weightDelta > 0 ? "+" : ""}
                  {fmt(weightDelta, 1)} кг
                </p>
              )}
              {targetWeight > 0 && (
                <div className="weightTarget">
                  До цели: <b>{fmt(Math.abs(Number(latestWeight.weight_kg) - targetWeight), 1)} кг</b>
                </div>
              )}
              <div className="weightHistory">
                {d.weights.slice(0, 6).map((w: any) => (
                  <div className="row" key={w.id}>
                    <span>{new Date(w.measured_at).toLocaleDateString("ru-RU")}</span>
                    <b>{fmt(w.weight_kg, 1)} кг</b>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Добавь вес в профиле — здесь появится динамика.</p>
          )}
        </section>
      </div>

      <section className="card top">
        <h2>AI‑отчёты</h2>
        {d.digests.slice(0, 7).map((x: any) => (
          <details className="digestItem" key={x.id}>
            <summary>
              <b>{new Date(x.for_date + "T12:00:00").toLocaleDateString("ru-RU")}</b>
              <span>{fmt(x.kcal)} ккал</span>
            </summary>
            <div className="digest" style={{ whiteSpace: "pre-wrap" }}>
              {cleanTelegramMarkdown(x.summary_md)}
            </div>
          </details>
        ))}
        {!d.digests.length && <p className="muted">Пока нет дневных отчётов.</p>}
      </section>
    </>
  );
}

function Summary({ l, v, s }: { l: string; v: string; s: string }) {
  return (
    <div className="progressSummaryCard">
      <span>{l}</span>
      <b>{v}</b>
      <small>{s}</small>
    </div>
  );
}
