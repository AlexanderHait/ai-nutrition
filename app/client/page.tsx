import TelegramAvatar from "@/components/TelegramAvatar";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Sparkles,
  Target,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { requireClient } from "@/lib/auth";
import { clientHomeAccountData } from "@/lib/account-data";
import { dayKey, fmt, mealDay, mealSessions, pluralMeals, sumMeals } from "@/lib/data";
import { sessionQuality } from "@/lib/meal-quality";
import FoodIcon from "@/components/FoodIcon";
import SimplifiedSections from "@/components/SimplifiedSections";

export const dynamic = "force-dynamic";

function cleanTelegramMarkdown(text: string) {
  return String(text || "")
    .replace(/\\([_*`])/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}

function pct(value: number, target: number) {
  return target > 0 ? Math.min(100, Math.round(value / target * 100)) : 0;
}

export default async function Page() {
  const session = await requireClient();
  const data = await clientHomeAccountData(session.accountId!);
  const today = dayKey();
  const todayMeals = data.meals.filter((meal) => mealDay(meal) === today);
  const total = sumMeals(todayMeals);
  const sessions = mealSessions(todayMeals);

  const kcalTarget = Number(data.settings?.kcal_target || 2000);
  const proteinTarget = Number(data.settings?.protein_target || data.settings?.protein_target_g || 0);
  const fatTarget = Number(data.settings?.fat_target || data.settings?.fat_target_g || 0);
  const carbTarget = Number(data.settings?.carb_target || data.settings?.carb_target_g || 0);
  const premium = data.subscription?.status === "active"
    && data.subscription?.plan === "premium"
    && (!data.subscription?.ends_at || new Date(data.subscription.ends_at) > new Date());
  const remaining = kcalTarget - total.kcal;
  const lastDigest = data.digests?.[0];
  const latestMeal = data.meals?.[0];
  const dataFresh = latestMeal
    ? new Date(latestMeal.eaten_at).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Moscow",
      })
    : "пока нет записей";

  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const day = dayKey(date);
    const rows = data.meals.filter((meal) => mealDay(meal) === day);
    return { day, total: sumMeals(rows), sessions: mealSessions(rows).length };
  });
  const activeDays = recentDays.filter((day) => day.sessions > 0).length;
  const avg = activeDays
    ? Math.round(recentDays.reduce((sum, day) => sum + day.total.kcal, 0) / activeDays)
    : 0;

  const todayQuality = sessions.reduce((result, item) => {
    const quality = sessionQuality(item.meals);
    return { bad: result.bad + quality.bad, check: result.check + quality.check };
  }, { bad: 0, check: 0 });

  const proteinRemaining = Math.max(0, proteinTarget - total.prot);
  const fatRemaining = Math.max(0, fatTarget - total.fat);
  const carbRemaining = Math.max(0, carbTarget - total.carb);
  const hour = Number(new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    hour12: false,
  }).format(new Date()));
  const likelyMealsLeft = hour < 13 ? 3 : hour < 17 ? 2 : 1;
  const nextMealKcal = Math.max(0, Math.round(Math.max(remaining, 0) / likelyMealsLeft / 50) * 50);
  const nextMealProtein = proteinTarget > 0
    ? Math.max(0, Math.round(proteinRemaining / likelyMealsLeft / 5) * 5)
    : 0;
  const nextMealText = remaining <= 0
    ? "Калорийная цель уже закрыта. Следующий приём лучше сделать лёгким и ориентироваться на голод."
    : `Ориентир: около ${fmt(nextMealKcal)} ккал${nextMealProtein ? ` и ${fmt(nextMealProtein)} г белка` : ""}.`;

  const attention = todayQuality.bad > 0
    ? {
        tone: "warn",
        icon: <AlertTriangle size={18} />,
        title: "Проверь несколько позиций",
        text: `${todayQuality.bad} поз. выглядят нетипично по массе или КБЖУ. Лучше быстро сверить их перед итогом дня.`,
      }
    : proteinTarget > 0 && proteinRemaining >= 25
      ? {
          tone: "focus",
          icon: <Target size={18} />,
          title: `Добери около ${fmt(proteinRemaining)} г белка`,
          text: "Следующий приём собери вокруг мяса, рыбы, яиц, творога или другого привычного белкового продукта.",
        }
      : sessions.length === 0
        ? {
            tone: "neutral",
            icon: <Sparkles size={18} />,
            title: "Добавь первый приём пищи",
            text: "После первой записи TeddY сразу покажет остаток калорий и подскажет, на чём сосредоточиться дальше.",
          }
        : {
            tone: "good",
            icon: <CheckCircle2 size={18} />,
            title: "День идёт по плану",
            text: "Сейчас достаточно продолжать фиксировать питание. Следующая подсказка обновится автоматически.",
          };

  return (
    <>
      <SimplifiedSections />
      <header className="clientWelcome">
        <div>
          <p>Сегодня, {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</p>
          <h1>{data.profile?.first_name ? `Привет, ${data.profile.first_name}` : "Твой рацион"}</h1>
          <span>{data.settings?.goal || "Главное о питании — без лишних расчётов"}</span>
        </div>
        <div className="clientWelcomeActions">
          <span className="freshDataChip"><Clock3 size={13} />Данные: {dataFresh}</span>
          <Link href="/client/profile" className="clientProfileChip">
            <TelegramAvatar profile={data.profile} size="small" />
            <span>
              <b>{data.profile?.first_name || "Профиль"}</b>
              <small>{premium ? "PREMIUM" : "BASIC"}</small>
            </span>
          </Link>
        </div>
      </header>

      <section className={`primaryFocus ${attention.tone}`}>
        <i>{attention.icon}</i>
        <div>
          <small>Главное сейчас</small>
          <b>{attention.title}</b>
          <p>{attention.text}</p>
        </div>
        <Link href="/client/nutrition">Открыть питание <ChevronRight size={15} /></Link>
      </section>

      <section className="clientDashboardHero">
        <div
          className="clientCalorieRing"
          style={{ "--progress": `${pct(total.kcal, kcalTarget)}%` } as React.CSSProperties}
        >
          <div><b>{fmt(total.kcal)}</b><span>/ {fmt(kcalTarget)} ккал</span></div>
        </div>
        <div className="clientHeroCopy">
          <span>Сегодня</span>
          <h2>{remaining >= 0 ? `Осталось ${fmt(remaining)} ккал` : `Выше цели на ${fmt(Math.abs(remaining))} ккал`}</h2>
          <p>{sessions.length ? `${sessions.length} ${pluralMeals(sessions.length)}` : "Питание ещё не добавлено"}</p>
          <div className="clientHeroActions">
            <Link className="primary compactBtn" href="/client/nutrition"><CalendarDays size={16} />Открыть питание</Link>
            <Link className="secondaryBtn" href="/client/progress"><TrendingUp size={16} />Прогресс</Link>
          </div>
        </div>
        <div className="clientHeroMacro">
          <Macro title="Белки" value={total.prot} target={proteinTarget} />
          <Macro title="Жиры" value={total.fat} target={fatTarget} />
          <Macro title="Углеводы" value={total.carb} target={carbTarget} />
        </div>
      </section>

      <section className="smartMealCard">
        <div className="smartMealIcon"><UtensilsCrossed size={20} /></div>
        <div className="smartMealBody">
          <span>Следующий приём</span>
          <h3>{nextMealText}</h3>
          <div className="smartMealMacros">
            {proteinTarget > 0 && <small>Белок: ещё {fmt(proteinRemaining)} г</small>}
            {fatTarget > 0 && <small>Жиры: ещё {fmt(fatRemaining)} г</small>}
            {carbTarget > 0 && <small>Углеводы: ещё {fmt(carbRemaining)} г</small>}
          </div>
        </div>
        <Link href="/client/nutrition">Рацион <ChevronRight size={15} /></Link>
      </section>

      <div className="clientHomeGrid top">
        <section className="card clientRecentMeals">
          <div className="sectionTitleRow">
            <div><h2>{todayMeals.length ? "Сегодняшние приёмы" : "Последние приёмы"}</h2><span className="muted">Только самое недавнее</span></div>
            <Link className="textLink" href="/client/nutrition">Все записи →</Link>
          </div>
          {(todayMeals.length ? sessions : mealSessions(data.meals).slice(0, 4)).slice(0, 4).map((item) => (
            <Link className="clientMealPreview" href={`/client/nutrition?day=${item.day}#day-${item.day}`} key={item.key}>
              <div className="mealPreviewIcons">
                {item.meals.slice(0, 3).map((meal) => <i key={meal.id}><FoodIcon dish={meal.dish} /></i>)}
              </div>
              <div className="mealPreviewText">
                <b>{item.meals.length === 1 ? item.meals[0].dish : `${item.meals.length} позиции`}</b>
                <small>{item.time} · {item.meals.slice(0, 2).map((meal) => meal.dish).join(" · ")}{item.meals.length > 2 ? "…" : ""}</small>
              </div>
              <strong>{fmt(item.total.kcal)} ккал</strong>
              <ChevronRight size={15} />
            </Link>
          ))}
          {!data.meals.length && (
            <div className="emptyGuidance">
              <Sparkles />
              <b>Начни с первого приёма</b>
              <span>Отправь фото или название продукта боту. После трёх дней записей появятся первые выводы о привычках.</span>
            </div>
          )}
        </section>

        {premium ? (
          <section className="card clientInsightCard">
            <div className="sectionTitleRow"><div><h2>Вывод TeddY</h2><span className="muted">Последний персональный разбор</span></div><Sparkles size={19} /></div>
            {lastDigest ? (
              <div className="clientDigestPreview">
                <div className="digestDate">{new Date(lastDigest.for_date + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</div>
                <p>{cleanTelegramMarkdown(lastDigest.summary_md)}</p>
                <Link className="textLink" href="/client/coach">Открыть Coach →</Link>
              </div>
            ) : (
              <div className="emptyGuidance">
                <Sparkles />
                <b>Нужно немного данных</b>
                <span>Веди рацион минимум три дня — TeddY подготовит первый персональный вывод.</span>
              </div>
            )}
          </section>
        ) : (
          <Link className="card clientInsightCard premiumSoftLock" href="/client/plan">
            <div className="sectionTitleRow"><div><h2>Что даст Premium</h2><span className="muted">Не список функций, а следующий шаг</span></div><Sparkles size={19} /></div>
            <div className="emptyGuidance">
              <Sparkles />
              <b>Что поесть, почему меняется вес и что исправить</b>
              <span>Premium превращает дневник в понятные ежедневные решения.</span>
            </div>
          </Link>
        )}
      </div>

      <details className="secondaryDisclosure top">
        <summary>
          <span><b>Неделя целиком</b><small>{activeDays} из 7 дней с рационом{avg ? ` · в среднем ${fmt(avg)} ккал` : ""}</small></span>
          <ChevronDown size={17} />
        </summary>
        <div className="disclosureBody">
          <div className="clientWeekCards">
            {recentDays.map((day) => (
              <Link
                href={`/client/nutrition?day=${day.day}#day-${day.day}`}
                className={day.day === today ? "today" : ""}
                key={day.day}
              >
                <span>{new Date(day.day + "T12:00:00").toLocaleDateString("ru-RU", { weekday: "short" })}</span>
                <b>{new Date(day.day + "T12:00:00").getDate()}</b>
                <small>{day.sessions ? `${day.sessions} ${pluralMeals(day.sessions)}` : "—"}</small>
                <i><em style={{ width: `${pct(day.total.kcal, kcalTarget)}%` }} /></i>
              </Link>
            ))}
          </div>
        </div>
      </details>
    </>
  );
}

function Macro({ title, value, target }: { title: string; value: number; target: number }) {
  const percentage = pct(value, target);
  return (
    <div className="heroMacroRow">
      <span>{title}</span>
      <b>{fmt(value, 1)} г</b>
      <small>{target ? `${percentage}%` : "—"}</small>
      <i><em style={{ width: `${percentage}%` }} /></i>
    </div>
  );
}
