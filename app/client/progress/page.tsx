import { requireClient } from "@/lib/auth";
import { clientData, fmt, sumMeals } from "@/lib/data";

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

  const grouped = new Map<string, typeof d.meals>();
  for (const m of d.meals) {
    if (!grouped.has(m.eaten_day)) grouped.set(m.eaten_day, []);
    grouped.get(m.eaten_day)!.push(m);
  }

  const days = [...grouped.entries()].slice(0, 7).map(([day, meals]) => ({
    day,
    total: sumMeals(meals),
  }));

  const maxKcal = Math.max(1, ...days.map((x) => x.total.kcal));
  const latestWeight = d.weights?.[0];
  const previousWeight = d.weights?.[1];
  const weightDelta =
    latestWeight && previousWeight
      ? Number(latestWeight.weight_kg) - Number(previousWeight.weight_kg)
      : null;

  return (
    <>
      <div className="pageHead">
        <div>
          <p>Динамика</p>
          <h1>Прогресс</h1>
          <span>Только показатели, которые реально полезно отслеживать</span>
        </div>
      </div>

      <div className="grid2">
        <section className="card">
          <h2>Последние 7 дней</h2>
          {days.length ? (
            <div style={{ display: "grid", gap: 14 }}>
              {days.map((x) => (
                <div key={x.day}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                    <span>
                      {new Date(x.day + "T12:00:00").toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                    <b>{fmt(x.total.kcal)} ккал</b>
                  </div>
                  <div className="progress" style={{ marginTop: 7 }}>
                    <i style={{ width: `${(x.total.kcal / maxKcal) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Пока недостаточно данных.</p>
          )}
        </section>

        <section className="card">
          <h2>Вес</h2>
          {latestWeight ? (
            <>
              <div style={{ fontSize: 38, fontWeight: 800 }}>{fmt(latestWeight.weight_kg, 1)} кг</div>
              {weightDelta !== null && (
                <p className="muted">
                  С прошлого измерения: {weightDelta > 0 ? "+" : ""}
                  {fmt(weightDelta, 1)} кг
                </p>
              )}
              <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
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
        <h2>Последние AI‑отчёты</h2>
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
