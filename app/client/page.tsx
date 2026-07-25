import { requireClient } from "@/lib/auth";
import { clientData, dayKey, fmt, sumMeals } from "@/lib/data";

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
  const today = dayKey();
  const tm = d.meals.filter((m) => m.eaten_day === today);
  const sum = sumMeals(tm);
  const goal = Number(d.settings?.kcal_target || 2000);

  const lastDigest = d.digests?.[0];
  const lastMeals = d.meals.slice(0, 4);

  return (
    <>
      <div className="pageHead">
        <div>
          <p>Сегодня</p>
          <h1>{d.profile?.first_name ? `Привет, ${d.profile.first_name}` : "Твой рацион"}</h1>
          <span>То же питание, которое ты сохраняешь в Telegram</span>
        </div>
      </div>

      <div className="heroKcal">
        <div>
          <span>Калории</span>
          <b>{fmt(sum.kcal)}</b>
          <small>из {fmt(goal)} ккал</small>
        </div>
        <div className="progress">
          <i style={{ width: `${Math.min(100, goal ? (sum.kcal / goal) * 100 : 0)}%` }} />
        </div>
      </div>

      <div className="stats">
        <Stat l="Белки" v={`${fmt(sum.prot, 1)} г`} />
        <Stat l="Жиры" v={`${fmt(sum.fat, 1)} г`} />
        <Stat l="Углеводы" v={`${fmt(sum.carb, 1)} г`} />
        <Stat l="Приёмов" v={String(tm.length)} />
      </div>

      <div className="grid2 top">
        <section className="card">
          <h2>{tm.length ? "Сегодня" : "Последние приёмы"}</h2>
          {(tm.length ? tm : lastMeals).map((m) => (
            <div className="meal" key={m.id}>
              <div>
                <b>{m.dish}</b>
                <small>
                  {fmt(m.grams)} г ·{" "}
                  {new Date(m.eaten_at).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Europe/Moscow",
                  })}
                  {!tm.length && ` · ${new Date(m.eaten_at).toLocaleDateString("ru-RU")}`}
                </small>
              </div>
              <div>
                <b>{fmt(m.kcal)} ккал</b>
                <small>
                  Б {fmt(m.prot, 1)} · Ж {fmt(m.fat, 1)} · У {fmt(m.carb, 1)}
                </small>
              </div>
            </div>
          ))}
          {!tm.length && !lastMeals.length && <p className="muted">Пока нет сохранённых приёмов пищи.</p>}
        </section>

        <section className="card">
          <h2>Последний отчёт AI</h2>
          {lastDigest ? (
            <>
              <p className="muted" style={{ marginTop: 0 }}>
                {new Date(lastDigest.for_date + "T12:00:00").toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                })}
                {" · "}
                {fmt(lastDigest.kcal)} ккал
              </p>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                {cleanTelegramMarkdown(lastDigest.summary_md)}
              </div>
            </>
          ) : (
            <p className="muted">Отчёт появится после первого дневного дайджеста.</p>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div className="stat">
      <span>{l}</span>
      <b>{v}</b>
    </div>
  );
}
