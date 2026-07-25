import Link from "next/link";
import { clientData, dayKey, fmt, sumMeals } from "@/lib/data";

export const dynamic = "force-dynamic";

function cleanTelegramMarkdown(value: string) {
  return String(value || "")
    .replace(/\\([_*`])/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function mealDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

function dateLabel(day: string) {
  return new Date(day + "T12:00:00").toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chatId = Number(id);
  const d = await clientData(chatId);
  if (!d.profile) return <div>Клиент не найден</div>;

  const today = dayKey();
  const todayMeals = d.meals.filter((m) => m.eaten_day === today);
  const todaySum = sumMeals(todayMeals);
  const recentMeals = d.meals.slice(0, 8);
  const lastDigest = d.digests[0];
  const recentLogs = d.logs.slice(0, 6).reverse();

  const settings = d.settings || {};
  const targetKcal = Number(settings.kcal_target || 0);
  const currentWeight = Number(settings.current_weight_kg || d.weights?.[0]?.weight_kg || 0);
  const targetWeight = Number(settings.target_weight_kg || 0);

  const grouped = new Map<string, typeof d.meals>();
  for (const meal of d.meals) {
    if (!grouped.has(meal.eaten_day)) grouped.set(meal.eaten_day, []);
    grouped.get(meal.eaten_day)!.push(meal);
  }
  const days = [...grouped.entries()].slice(0, 7).reverse().map(([day, meals]) => ({
    day,
    total: sumMeals(meals),
  }));
  const maxKcal = Math.max(targetKcal || 0, 1, ...days.map((x) => x.total.kcal));

  return (
    <>
      <Link className="back" href="/admin/clients">← Клиенты</Link>

      <div className="profileHero compactHero">
        <div className="avatar">{(d.profile.first_name || "К")[0]}</div>
        <div>
          <h1>{d.profile.first_name || "Без имени"}</h1>
          <p>{d.profile.username ? "@" + d.profile.username : String(chatId)}</p>
        </div>
      </div>

      <section className="card todayCard">
        <div className="sectionTitleRow">
          <div>
            <h2>Сегодня</h2>
            <span className="muted">
              {todayMeals.length} {todayMeals.length === 1 ? "приём" : "приёма"} пищи
            </span>
          </div>
          {targetKcal > 0 && (
            <span className="goalStatus">
              {fmt(todaySum.kcal)} / {fmt(targetKcal)} ккал
            </span>
          )}
        </div>
        <div className="miniStats">
          <MiniStat l="Калории" v={`${fmt(todaySum.kcal)} ккал`} />
          <MiniStat l="Белки" v={`${fmt(todaySum.prot, 1)} г`} />
          <MiniStat l="Жиры" v={`${fmt(todaySum.fat, 1)} г`} />
          <MiniStat l="Углеводы" v={`${fmt(todaySum.carb, 1)} г`} />
        </div>
        {targetKcal > 0 && (
          <div className="goalProgress">
            <i style={{ width: `${Math.min(100, (todaySum.kcal / targetKcal) * 100)}%` }} />
          </div>
        )}
      </section>

      <div className="grid2 clientCoreGrid">
        <section className="card">
          <div className="sectionTitleRow"><h2>Цели и вес</h2></div>
          <div className="clientFacts">
            <Fact l="Цель" v={settings.goal || "Не указана"} />
            <Fact l="Калории" v={targetKcal ? `${fmt(targetKcal)} ккал` : "Не указаны"} />
            <Fact l="Рост" v={settings.height_cm ? `${fmt(settings.height_cm, 1)} см` : "—"} />
            <Fact l="Вес" v={currentWeight ? `${fmt(currentWeight, 1)} кг` : "—"} />
            <Fact l="Целевой вес" v={targetWeight ? `${fmt(targetWeight, 1)} кг` : "—"} />
            <Fact l="Тариф" v={d.subscription?.plan ? String(d.subscription.plan) : "Нет подписки"} />
          </div>
        </section>

        <section className="card">
          <div className="sectionTitleRow"><h2>Калории · 7 дней</h2></div>
          {days.length ? (
            <div className="clientWeekChart">
              {days.map((x) => {
                const height = Math.max(4, (x.total.kcal / maxKcal) * 100);
                return (
                  <div className="clientWeekCol" key={x.day}>
                    <span>{fmt(x.total.kcal)}</span>
                    <div className="clientWeekTrack">
                      <i style={{ height: `${height}%` }} />
                      {targetKcal > 0 && (
                        <em style={{ bottom: `${Math.min(100, (targetKcal / maxKcal) * 100)}%` }} />
                      )}
                    </div>
                    <small>{dateLabel(x.day)}</small>
                  </div>
                );
              })}
            </div>
          ) : <Empty />}
        </section>
      </div>

      <div className="grid2 clientCoreGrid top">
        <section className="card">
          <div className="sectionTitleRow"><h2>Последние приёмы пищи</h2></div>
          {recentMeals.length ? recentMeals.map((m) => (
            <div className="meal" key={m.id}>
              <div>
                <b>{m.dish}</b>
                <small>{mealDate(m.eaten_at)} · {fmt(m.grams)} г</small>
              </div>
              <div>
                <b>{fmt(m.kcal)} ккал</b>
                <small>Б {fmt(m.prot, 1)} · Ж {fmt(m.fat, 1)} · У {fmt(m.carb, 1)}</small>
              </div>
            </div>
          )) : <Empty />}
        </section>

        <section className="card">
          <div className="sectionTitleRow"><h2>Последний AI‑отчёт</h2></div>
          {lastDigest ? (
            <>
              <div className="digestMeta">
                {new Date(lastDigest.for_date + "T12:00:00").toLocaleDateString("ru-RU")}
              </div>
              <div className="digest cleanDigest">{cleanTelegramMarkdown(lastDigest.summary_md || "")}</div>
            </>
          ) : <Empty />}
        </section>
      </div>

      <section className="card top">
        <div className="sectionTitleRow">
          <h2>Последние сообщения</h2>
          <Link href={`/admin/dialogs?chat=${chatId}`} className="textLink">Весь диалог →</Link>
        </div>
        {recentLogs.length ? recentLogs.map((x: any) => (
          <div className={"chat " + x.role} key={x.id}>
            <b>{x.role === "user" ? "Клиент" : "AI"}</b>
            <p>{cleanTelegramMarkdown(x.content || "")}</p>
          </div>
        )) : <Empty />}
      </section>
    </>
  );
}

function MiniStat({ l, v }: { l: string; v: string }) {
  return <div className="miniStat"><span>{l}</span><b>{v}</b></div>;
}
function Fact({ l, v }: { l: string; v: string }) {
  return <div className="clientFact"><span>{l}</span><b>{v}</b></div>;
}
function Empty() {
  return <p className="muted">Пока нет данных.</p>;
}
