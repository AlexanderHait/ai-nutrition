import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Crown,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { requireClient } from "@/lib/auth";
import {
  clientHomeAccountData,
  clientPremiumAccountData,
  premiumIntelligenceAccountData,
} from "@/lib/account-data";
import { subscriptionAccess } from "@/lib/subscription-access";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { dayKey, fmt, mealDay, mealSessions, pluralMeals, sumMeals, type Meal } from "@/lib/data";
import FoodIcon from "@/components/FoodIcon";
import SimplifiedSections from "@/components/SimplifiedSections";
import MichelinSections from "@/components/MichelinSections";

export const dynamic = "force-dynamic";

function clean(text: unknown) {
  return String(text || "")
    .replace(/\\([_*`])/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

function excerpt(text: unknown, length = 280) {
  const value = clean(text);
  return value.length > length ? `${value.slice(0, length).trim()}…` : value;
}

function percent(value: number, target: number) {
  return target > 0 ? Math.round(value / target * 100) : 0;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export default async function Page() {
  const session = await requireClient();
  const db = getSupabaseAdmin();
  const from = new Date();
  from.setDate(from.getDate() - 13);
  const fromDay = dayKey(from);

  const [data, access, premiumData, intelligence, fortnightResult] = await Promise.all([
    clientHomeAccountData(session.accountId!),
    subscriptionAccess(session.accountId!),
    clientPremiumAccountData(session.accountId!),
    premiumIntelligenceAccountData(session.accountId!),
    db.from("meals")
      .select("id,chat_id,dish,grams,kcal,prot,fat,carb,eaten_at,eaten_day,deleted")
      .eq("account_id", session.accountId!)
      .eq("deleted", false)
      .gte("eaten_day", fromDay)
      .order("eaten_at", { ascending: false })
      .limit(1000),
  ]);

  const today = dayKey();
  const todayMeals = (data.meals as Meal[]).filter((meal: Meal) => mealDay(meal) === today);
  const sessions = mealSessions(todayMeals);
  const total = sumMeals(todayMeals);
  const settings = data.settings || {};
  const kcalTarget = Number(settings.kcal_target || 2000);
  const proteinTarget = Number(settings.protein_target || settings.protein_target_g || 0);
  const fatTarget = Number(settings.fat_target || settings.fat_target_g || 0);
  const carbTarget = Number(settings.carb_target || settings.carb_target_g || 0);
  const remainingKcal = kcalTarget - total.kcal;
  const remainingProtein = Math.max(0, proteinTarget - total.prot);
  const premium = access.premium;

  const allMeals = (fortnightResult.data || []) as Meal[];
  const dayTotals = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    const key = dayKey(date);
    const rows = allMeals.filter((meal: Meal) => mealDay(meal) === key);
    return { day: key, total: sumMeals(rows), active: rows.length > 0 };
  });
  const previousDays = dayTotals.slice(0, 7).filter((day) => day.active);
  const currentDays = dayTotals.slice(7).filter((day) => day.active);
  const currentAvgKcal = average(currentDays.map((day) => day.total.kcal));
  const previousAvgKcal = average(previousDays.map((day) => day.total.kcal));
  const currentAvgProtein = average(currentDays.map((day) => day.total.prot));
  const calorieChange = currentAvgKcal && previousAvgKcal
    ? Math.round(currentAvgKcal - previousAvgKcal)
    : null;

  const hour = Number(new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    hour12: false,
  }).format(new Date()));
  const likelyMealsLeft = hour < 13 ? 3 : hour < 17 ? 2 : 1;
  const nextMealKcal = Math.max(0, Math.round(Math.max(remainingKcal, 0) / likelyMealsLeft / 50) * 50);
  const nextMealProtein = proteinTarget > 0
    ? Math.max(0, Math.round(remainingProtein / likelyMealsLeft / 5) * 5)
    : 0;

  const mainAdvice = sessions.length === 0
    ? {
        icon: <Sparkles size={19} />,
        title: "Добавь первый приём пищи",
        text: "После первой записи TeddY покажет остаток дня и даст конкретную рекомендацию.",
      }
    : remainingKcal < -kcalTarget * 0.1
      ? {
          icon: <AlertTriangle size={19} />,
          title: `Сегодня выше цели на ${fmt(Math.abs(remainingKcal))} ккал`,
          text: "Не нужно компенсировать голоданием. Следующий приём сделай легче и вернись к обычному режиму завтра.",
        }
      : remainingProtein >= 25
        ? {
            icon: <UtensilsCrossed size={19} />,
            title: `Добери около ${fmt(remainingProtein)} г белка`,
            text: "Следующий приём лучше построить вокруг мяса, рыбы, яиц, творога или привычного белкового продукта.",
          }
        : {
            icon: <CheckCircle2 size={19} />,
            title: "Сегодня всё идёт нормально",
            text: "Продолжай обычный режим и ориентируйся на голод. Специально корректировать рацион сейчас не нужно.",
          };

  const weightDelta = Number(intelligence.context?.weight_trend?.delta);
  const goal = String(settings.goal || "");
  const signals: Array<{ title: string; text: string; tone: string }> = [];

  if (currentDays.length >= 3 && kcalTarget > 0 && currentAvgKcal < kcalTarget * 0.85) {
    signals.push({
      title: "Калорийность несколько дней ниже цели",
      text: `Среднее около ${fmt(currentAvgKcal)} ккал при цели ${fmt(kcalTarget)}. Это уже похоже на повторяющийся паттерн.`,
      tone: "warn",
    });
  }
  if (currentDays.length >= 3 && proteinTarget > 0 && currentAvgProtein < proteinTarget * 0.85) {
    signals.push({
      title: "Белок регулярно не добирается",
      text: `Среднее ${fmt(currentAvgProtein, 1)} г при цели ${fmt(proteinTarget, 1)} г. Лучше добавить стабильный белковый продукт в один из ежедневных приёмов.`,
      tone: "warn",
    });
  }
  if (Number.isFinite(weightDelta) && weightDelta !== 0) {
    const againstGoal = (goal === "Набор массы" && weightDelta < 0)
      || (goal === "Снижение веса" && weightDelta > 0);
    if (againstGoal) {
      signals.push({
        title: "Вес движется против выбранной цели",
        text: `${weightDelta > 0 ? "+" : ""}${fmt(weightDelta, 1)} кг по доступным измерениям. Проверь среднюю калорийность и регулярность записей.`,
        tone: "warn",
      });
    }
  }
  if (!signals.length && currentDays.length >= 3) {
    signals.push({
      title: "Новых тревожных тенденций нет",
      text: calorieChange == null
        ? "Продолжай вести рацион — сравнение с прошлой неделей появится после накопления данных."
        : `Средние калории изменились на ${calorieChange > 0 ? "+" : ""}${fmt(calorieChange)} ккал к прошлой неделе.`,
      tone: "good",
    });
  }

  const todayPlan = premiumData.plan?.content_md
    ? excerpt(premiumData.plan.content_md)
    : remainingKcal > 0
      ? `На остаток дня около ${fmt(remainingKcal)} ккал${remainingProtein ? ` и ${fmt(remainingProtein)} г белка` : ""}. Распредели их без резких ограничений.`
      : "Калорийная цель уже закрыта. Ориентируйся на голод и не пытайся компенсировать день жёсткими ограничениями.";
  const weeklyFocus = premiumData.report?.content_md
    ? excerpt(premiumData.report.content_md, 220)
    : currentDays.length < 3
      ? "Собери хотя бы три обычных дня питания. После этого TeddY сможет отличать случайность от устойчивой привычки."
      : currentAvgKcal < kcalTarget * 0.85
        ? "Главный фокус недели — не оставлять большой недобор калорий на вечер и сделать питание более равномерным."
        : "Главный фокус недели — удерживать стабильный ритм без лишних ежедневных корректировок.";

  const recentSessions = mealSessions(data.meals).slice(0, 4);

  return (
    <>
      <SimplifiedSections />
      <MichelinSections />

      <header className="clientWelcome">
        <div>
          <p>{new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</p>
          <h1>{data.profile?.first_name ? `${data.profile.first_name}, сегодня` : "Сегодня"}</h1>
          <span>{settings.goal || "Понятный план питания на текущий день"}</span>
        </div>
      </header>

      <section className="primaryFocus">
        <i>{mainAdvice.icon}</i>
        <div>
          <small>Главное сейчас</small>
          <b>{mainAdvice.title}</b>
          <p>{mainAdvice.text}</p>
        </div>
        <Link href="/client/nutrition">Открыть питание <ChevronRight size={15} /></Link>
      </section>

      <section className="todayNutritionCard top">
        <div className="todayNumbers">
          <small>Съедено сегодня</small>
          <b>{fmt(total.kcal)} <em>из {fmt(kcalTarget)} ккал</em></b>
          <p>{remainingKcal >= 0 ? `Осталось около ${fmt(remainingKcal)} ккал` : `Выше цели на ${fmt(Math.abs(remainingKcal))} ккал`}</p>
        </div>
        <div className="todayMacros">
          <Macro label="Белок" value={total.prot} target={proteinTarget} />
          <Macro label="Жиры" value={total.fat} target={fatTarget} />
          <Macro label="Углеводы" value={total.carb} target={carbTarget} />
        </div>
        <div className="todayActions">
          <Link className="primary" href="/client/nutrition">Посмотреть сегодняшний рацион</Link>
          <span>
            <Link href="/client/profile#weight">Записать вес</Link>
            <Link href="/client/progress">Посмотреть прогресс</Link>
          </span>
        </div>
      </section>

      <section className="nextMealCard top">
        <i><UtensilsCrossed size={19} /></i>
        <div>
          <small>Следующий приём</small>
          <b>
            {remainingKcal <= 0
              ? "Лёгкий приём по голоду"
              : `Ориентир — ${fmt(nextMealKcal)} ккал${nextMealProtein ? ` и ${fmt(nextMealProtein)} г белка` : ""}`}
          </b>
          <p>
            {remainingProtein >= 25
              ? "Сделай белок основой, затем добавь привычный гарнир и овощи."
              : "Не нужно специально урезать или добирать еду — продолжай обычный ритм."}
          </p>
        </div>
      </section>

      {signals.length ? (
        <section className="card top calmSignals">
          <div className="sectionTitleRow"><div><h2>Важное</h2><span className="muted">Только устойчивые сигналы, без лишних уведомлений</span></div></div>
          <div className="signalList">
            {signals.slice(0, 2).map((signal) => (
              <div className={`signalRow ${signal.tone}`} key={signal.title}>
                <i>{signal.tone === "good" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}</i>
                <span><b>{signal.title}</b><small>{signal.text}</small></span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {premium ? (
        <section className="card top coachHome" id="coach">
          <div className="sectionTitleRow">
            <div><h2>Твой нутрициолог</h2><span className="muted">План дня и недельный фокус без технических показателей</span></div>
            <Crown size={18} />
          </div>
          <div className="coachHomeGrid">
            <article>
              <small>Сегодня</small>
              <b>План дня</b>
              <p>{todayPlan}</p>
            </article>
            <article>
              <small>На этой неделе</small>
              <b>Главный фокус</b>
              <p>{weeklyFocus}</p>
            </article>
          </div>
          <Link className="secondaryBtn coachHomeLink" href="/client/coach">Открыть полный разбор</Link>
        </section>
      ) : (
        <Link className="premiumQuietInvite top" href="/client/plan">
          <Crown size={18} />
          <span><b>Нужен персональный план?</b><small>Premium объясняет причины изменений и подсказывает следующий шаг.</small></span>
          <strong>Посмотреть →</strong>
        </Link>
      )}

      <section className="card top recentMealsCompact">
        <div className="sectionTitleRow">
          <div><h2>Последние приёмы</h2><span className="muted">{sessions.length ? `${sessions.length} ${pluralMeals(sessions.length)} сегодня` : "Сегодня записей пока нет"}</span></div>
          <Link className="textLink" href="/client/nutrition">Все записи →</Link>
        </div>
        {recentSessions.map((item: any) => (
          <Link className="clientMealPreview" href={`/client/nutrition?day=${item.day}#day-${item.day}`} key={item.key}>
            <div className="mealPreviewIcons">
              {item.meals.slice(0, 3).map((meal: Meal) => <i key={meal.id}><FoodIcon dish={meal.dish} /></i>)}
            </div>
            <div className="mealPreviewText">
              <b>{item.meals.length === 1 ? item.meals[0].dish : `${item.meals.length} позиции`}</b>
              <small>{item.time} · {item.meals.slice(0, 2).map((meal: Meal) => meal.dish).join(" · ")}{item.meals.length > 2 ? "…" : ""}</small>
            </div>
            <strong>{fmt(item.total.kcal)} ккал</strong>
            <ChevronRight size={15} />
          </Link>
        ))}
        {!recentSessions.length ? (
          <div className="emptyGuidance">
            <Sparkles />
            <b>Добавь первый приём</b>
            <span>После трёх дней питания и двух измерений веса появится первая реальная тенденция.</span>
          </div>
        ) : null}
      </section>
    </>
  );
}

function Macro({ label, value, target }: { label: string; value: number; target: number }) {
  const ratio = percent(value, target);
  return (
    <div>
      <span>{label}</span>
      <b>{fmt(value, 1)} г</b>
      <small>{target > 0 ? `${ratio}% от ${fmt(target, 1)} г` : "цель не задана"}</small>
      <i><em style={{ width: `${Math.min(100, Math.max(0, ratio))}%` }} /></i>
    </div>
  );
}
