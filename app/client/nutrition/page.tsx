import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, History, Sparkles } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { clientNutritionAccountData } from "@/lib/account-data";
import { dayKey, fmt, mealDay, mealSessions, pluralMeals, sumMeals } from "@/lib/data";
import { mealQuality, sessionQuality } from "@/lib/meal-quality";
import FoodIcon from "@/components/FoodIcon";
import TimelinePanel from "@/components/TimelinePanel";
import SimplifiedSections from "@/components/SimplifiedSections";
import MichelinSections from "@/components/MichelinSections";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ day?: string }>;

function label(day: string) {
  return new Date(day + "T12:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireClient();
  const meals = await clientNutritionAccountData(session.accountId!, 90);
  const query = await searchParams;
  const selected = typeof query.day === "string" ? query.day : "";
  const today = dayKey();

  const groups = new Map<string, typeof meals>();
  for (const meal of meals) {
    const key = mealDay(meal);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(meal);
  }

  const entries = [...groups.entries()].sort(([a], [b]) => {
    if (a === selected) return -1;
    if (b === selected) return 1;
    return b.localeCompare(a);
  });

  const calendar = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    const day = dayKey(date);
    const rows = groups.get(day) || [];
    return { day, sessions: mealSessions(rows).length, kcal: sumMeals(rows).kcal };
  });

  return (
    <>
      <SimplifiedSections />
      <MichelinSections />

      <div className="pageHead nutritionPageHead">
        <div>
          <p>Питание</p>
          <h1>Дневник питания</h1>
          <span>Текущие и прошлые приёмы собраны в одном разделе. История сопровождения находится ниже.</span>
        </div>
      </div>

      {!!entries.length ? (
        <details className="secondaryDisclosure">
          <summary>
            <span><b>Выбрать другой день</b><small>Последние 14 дней · {groups.size} дней с записями</small></span>
            <ChevronDown size={18} />
          </summary>
          <div className="disclosureBody">
            <div className="nutritionCalendarStrip">
              {calendar.map((item) => (
                <Link
                  href={`/client/nutrition?day=${item.day}#day-${item.day}`}
                  className={`${item.day === selected ? "active " : ""}${item.sessions ? "hasData " : ""}${item.day === today ? "today" : ""}`}
                  key={item.day}
                >
                  <span>{new Date(item.day + "T12:00:00").toLocaleDateString("ru-RU", { weekday: "short" })}</span>
                  <b>{new Date(item.day + "T12:00:00").getDate()}</b>
                  <small>{item.sessions ? `${item.sessions} ${pluralMeals(item.sessions)}` : "—"}</small>
                </Link>
              ))}
            </div>
          </div>
        </details>
      ) : null}

      <div className="nutritionDays modernNutrition top">
        {entries.slice(0, 45).map(([day, rows]) => {
          const total = sumMeals(rows);
          const sessions = mealSessions(rows);
          const active = day === selected;
          return (
            <section className={`nutritionDay ${active ? "selectedDay" : ""}`} id={`day-${day}`} key={day}>
              <header className="nutritionDayHead modern">
                <div><h2>{label(day)}</h2><span>{sessions.length} {pluralMeals(sessions.length)} · {rows.length} позиций</span></div>
                <div className="nutritionDayTotal"><b>{fmt(total.kcal)} ккал</b><small>Б {fmt(total.prot, 1)} · Ж {fmt(total.fat, 1)} · У {fmt(total.carb, 1)}</small></div>
              </header>

              <div className="visualMealHistory">
                {sessions.map((item: any, index: number) => (
                  <details className="clientSessionCard" key={item.key} open={active && index === 0}>
                    <summary>
                      <div className="sessionIconStack">{item.meals.slice(0, 3).map((meal: any) => <i key={meal.id}><FoodIcon dish={meal.dish} /></i>)}</div>
                      <div className="sessionTitle">
                        <time>{item.time}</time>
                        <b>{item.meals.length === 1 ? item.meals[0].dish : `${item.meals.length} позиции`}</b>
                        <small>{item.meals.slice(0, 3).map((meal: any) => meal.dish).join(" · ")}{item.meals.length > 3 ? "…" : ""}</small>
                      </div>
                      <div className="sessionTotal"><b>{fmt(item.total.kcal)} ккал</b><small>Б {fmt(item.total.prot, 1)} · Ж {fmt(item.total.fat, 1)} · У {fmt(item.total.carb, 1)}</small></div>
                      {sessionQuality(item.meals).ok
                        ? <span className="mealQualityChip ok"><CheckCircle2 size={13} />OK</span>
                        : <span className="mealQualityChip check"><AlertTriangle size={13} />Проверить</span>}
                      <ChevronDown className="sessionChevron" size={17} />
                    </summary>
                    <div className="sessionItems">
                      {item.meals.map((meal: any) => (
                        <div className="sessionFoodRow" key={meal.id}>
                          <i><FoodIcon dish={meal.dish} /></i>
                          <span>
                            <b>{meal.dish}</b>
                            <small>{fmt(meal.grams)} г · Б {fmt(meal.prot, 1)} · Ж {fmt(meal.fat, 1)} · У {fmt(meal.carb, 1)}</small>
                            {mealQuality(meal).level !== "ok" ? <em className="mealIssue">{mealQuality(meal).reasons[0]}</em> : null}
                          </span>
                          <strong>{fmt(meal.kcal)} ккал</strong>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}

        {!entries.length ? (
          <section className="card emptyGuidance">
            <Sparkles />
            <b>Добавь первый день питания</b>
            <span>Отправляй фото или названия продуктов боту. После трёх заполненных дней TeddY покажет первые закономерности и рекомендации.</span>
          </section>
        ) : null}
      </div>

      <details className="secondaryDisclosure top" id="history">
        <summary>
          <span><b>История сопровождения</b><small>Вес, питание и решения TeddY в одной хронологии</small></span>
          <History size={18} />
        </summary>
        <div className="disclosureBody timelineInsideNutrition">
          <TimelinePanel />
        </div>
      </details>
    </>
  );
}
