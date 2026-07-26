import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { clientData, dayKey, fmt, mealSessions, sumMeals } from "@/lib/data";

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
  const todaySessions = mealSessions(tm);

  const kcalTarget = Number(d.settings?.kcal_target || 2000);
  const proteinTarget = Number(d.settings?.protein_target || 0);
  const fatTarget = Number(d.settings?.fat_target || 0);
  const carbTarget = Number(d.settings?.carb_target || 0);
  const remaining = Math.max(0, kcalTarget - sum.kcal);

  const lastDigest = d.digests?.[0];
  const shownMeals = tm.length ? tm : d.meals.slice(0, 4);

  return (
    <>
      <div className="pageHead">
        <div>
          <p>Сегодня</p>
          <h1>{d.profile?.first_name ? `Привет, ${d.profile.first_name}` : "Твой рацион"}</h1>
          <span>{d.settings?.goal || "Питание и прогресс в одном месте"}</span>
        </div>
      </div>

      <section className="clientTodayHero">
        <div className="clientTodayMain">
          <span>Калории</span>
          <div><b>{fmt(sum.kcal)}</b><small> / {fmt(kcalTarget)} ккал</small></div>
          <p>
            {sum.kcal <= kcalTarget
              ? `Осталось ${fmt(remaining)} ккал`
              : `Выше цели на ${fmt(sum.kcal - kcalTarget)} ккал`}
          </p>
        </div>
        <div className="goalProgress large">
          <i style={{ width: `${Math.min(100, (sum.kcal / kcalTarget) * 100)}%` }} />
        </div>
      </section>

      <div className="clientMacroGrid">
        <Macro l="Белки" value={sum.prot} target={proteinTarget} />
        <Macro l="Жиры" value={sum.fat} target={fatTarget} />
        <Macro l="Углеводы" value={sum.carb} target={carbTarget} />
        <div className="clientMacroCard">
          <span>Приёмов</span>
          <b>{todaySessions.length}</b>
          <small>{tm.length > todaySessions.length ? `${tm.length} позиций` : "сегодня"}</small>
        </div>
      </div>

      <div className="grid2 top">
        <section className="card">
          <div className="sectionTitleRow">
            <h2>{tm.length ? "Сегодня" : "Последние приёмы"}</h2>
            <Link className="textLink" href="/client/nutrition">История →</Link>
          </div>
          {shownMeals.map((m) => (
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
                <small>Б {fmt(m.prot, 1)} · Ж {fmt(m.fat, 1)} · У {fmt(m.carb, 1)}</small>
              </div>
            </div>
          ))}
          {!shownMeals.length && <p className="muted">Отправь еду боту — запись появится здесь автоматически.</p>}
        </section>

        <section className="card">
          <div className="sectionTitleRow">
            <h2>Последний отчёт AI</h2>
            <Link className="textLink" href="/client/progress">Прогресс →</Link>
          </div>
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

function Macro({ l, value, target }: { l: string; value: number; target: number }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="clientMacroCard">
      <span>{l}</span>
      <b>{fmt(value, 1)} г</b>
      <small>{target ? `из ${fmt(target, 1)} г` : "цель не задана"}</small>
      {target > 0 && <div className="macroProgress"><i style={{ width: `${pct}%` }} /></div>}
    </div>
  );
}
