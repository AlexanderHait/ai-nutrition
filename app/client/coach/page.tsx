import Link from "next/link";
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Crown,
  Flame,
  HelpCircle,
  MessageCircleMore,
  ShoppingBasket,
  Sparkles,
  Store,
  Target,
  Timer,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { requireClient } from "@/lib/auth";
import {
  clientPremiumAccountData,
  premiumIntelligenceAccountData,
} from "@/lib/account-data";
import { subscriptionAccess } from "@/lib/subscription-access";
import SimplifiedSections from "@/components/SimplifiedSections";

export const dynamic = "force-dynamic";

const clean = (value: unknown) => String(value || "")
  .replace(/\*\*(.*?)\*\*/g, "$1")
  .replace(/\*(.*?)\*/g, "$1");

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; feedback?: string; checkin?: string }>;
}) {
  const current = await requireClient();
  const query = await searchParams;
  const access = await subscriptionAccess(current.accountId!);

  if (!access.premium) {
    return (
      <>
        <SimplifiedSections />
        <div className="pageHead">
          <div>
            <p>Premium Coach</p>
            <h1>Персональный нутрициолог</h1>
            <span>Помогает принимать решения по питанию, а не просто показывает цифры.</span>
          </div>
        </div>

        <section className="coachLockedCompact">
          <div className="coachLockedLead">
            <i><Crown size={25} /></i>
            <div>
              <small>TeddY Premium</small>
              <h2>Один понятный следующий шаг</h2>
              <p>План дня, объяснение динамики веса и корректировка питания на основе твоих данных.</p>
            </div>
            <Link className="primary" href="/client/plan">Посмотреть Premium</Link>
          </div>
          <div className="coachLockedBenefits">
            <div><UtensilsCrossed size={17} /><span><b>Что поесть</b><small>С учётом остатка дня</small></span></div>
            <div><TrendingUp size={17} /><span><b>Почему меняется вес</b><small>Связь рациона и результата</small></span></div>
            <div><Target size={17} /><span><b>Что исправить</b><small>Один приоритет на неделю</small></span></div>
          </div>
        </section>
      </>
    );
  }

  const [data, intelligence] = await Promise.all([
    clientPremiumAccountData(current.accountId!),
    premiumIntelligenceAccountData(current.accountId!),
  ]);

  const context: any = intelligence.context || {};
  const quality = context.data_quality || {};
  const today = context.today || {};
  const eaten = today.eaten || {};
  const remaining = today.remaining || {};
  const weight = context.weight_trend || {};
  const settings = context.settings || {};
  const latest = intelligence.recommendations?.[0];
  const checkin = intelligence.checkins?.[0];
  const pacing = dayPacing(Number(eaten.kcal || 0), Number(settings.kcal_target || 0), today.pacing);
  const weightText = weight.delta == null
    ? "Недостаточно измерений"
    : `${Number(weight.delta) > 0 ? "+" : ""}${Number(weight.delta).toFixed(1)} кг по тренду`;
  const focus = buildFocus(context, pacing);
  const starterPlan = buildStarterPlan(context, pacing);
  const weeklyFocus = buildWeeklyFocus(context);
  const activeDays = Number(quality.active_days_7 ?? quality.active_days ?? 0);

  return (
    <>
      <SimplifiedSections />
      <div className="pageHead">
        <div>
          <p>Premium Coach</p>
          <h1>Мой нутрициолог</h1>
          <span>Главное решение на сегодня и один приоритет на неделю.</span>
        </div>
        <div className="coachHeadActions">
          <Link href="/client/onboarding" className="secondaryBtn">Настройки</Link>
          <span className="premiumStatus"><Crown size={14} />{access.state === "trial" ? "PREMIUM TRIAL" : "PREMIUM"}</span>
        </div>
      </div>

      {(query.saved || query.feedback || query.checkin) && (
        <div className="successNotice"><CheckCircle2 size={16} />Сохранено. TeddY учтёт это дальше.</div>
      )}

      <section className="coachNow">
        <div><small>СЕГОДНЯ</small><h2>{pacing.title}</h2><p>{Math.round(Number(remaining.kcal || 0))} ккал · {Math.round(Number(remaining.protein || 0))} г белка осталось</p></div>
        <div><small>СЛЕДУЮЩИЙ ШАГ</small><h2>{focus}</h2><p>{pacing.detail}</p></div>
        <div><small>ВЕС</small><h2>{weightText}</h2><p>{weight.measurements || 0} измерений</p></div>
        <div><small>ДАННЫЕ</small><h2>{quality.level === "high" ? "Надёжные" : quality.level === "medium" ? "Уже полезные" : "Пока мало"}</h2><p>{activeDays} дн. с питанием за неделю</p></div>
      </section>

      <div className="premiumCoachGrid top">
        <section className="card premiumPlanHero">
          <div className="sectionTitleRow"><div><h2>План на сегодня</h2><span className="muted">Конкретно и без лишней теории</span></div><Sparkles /></div>
          {data.plan
            ? <div className="premiumLongText">{clean(data.plan.content_md)}</div>
            : <div className="premiumLongText"><b>Стартовый план</b><p>{starterPlan}</p><small className="muted">План станет точнее по мере накопления данных.</small></div>}
        </section>

        <section className="card">
          <div className="sectionTitleRow"><div><h2>{activeDays >= 7 ? "Фокус недели" : "Текущий фокус"}</h2><span className="muted">Один главный приоритет</span></div><Target /></div>
          {data.report
            ? <div className="premiumLongText">{clean(data.report.content_md)}</div>
            : <div className="premiumLongText"><b>{weeklyFocus.title}</b><p>{weeklyFocus.text}</p><small className="muted">{weeklyFocus.note}</small></div>}
        </section>
      </div>

      {latest && (
        <section className="card top recommendationReview">
          <div className="sectionTitleRow"><div><h2>Последняя рекомендация</h2><span className="muted">TeddY помнит предыдущий совет</span></div><HelpCircle /></div>
          <p>{clean(latest.recommendation_text)}</p>
          {latest.reason_text && <details><summary>Почему?</summary><div>{clean(latest.reason_text)}</div></details>}
          {!latest.feedback && (
            <form action="/api/premium/feedback" method="post">
              <input type="hidden" name="id" value={latest.id} />
              <button name="feedback" value="useful" className="secondaryBtn">Полезно</button>
              <select name="reason" defaultValue="">
                <option value="">Причина, если не подходит</option>
                <option>Не люблю эти продукты</option>
                <option>Слишком дорого</option>
                <option>Нет времени готовить</option>
                <option>Слишком большой объём</option>
                <option>Другое</option>
              </select>
              <button name="feedback" value="not_fit" className="secondaryBtn">Не подходит</button>
            </form>
          )}
        </section>
      )}

      {data.proposal && (
        <section className="strategyProposal top">
          <div>
            <span>Предложение по стратегии</span>
            <h2>{data.proposal.reason}</h2>
            <p>{data.proposal.current_kcal && data.proposal.proposed_kcal
              ? `${data.proposal.current_kcal} → ${data.proposal.proposed_kcal} ккал`
              : "TeddY предлагает обновить дневные цели."}</p>
          </div>
          <form action="/api/premium/proposal" method="post">
            <input type="hidden" name="id" value={data.proposal.id} />
            <button className="primary" name="action" value="apply">Применить</button>
            <button className="secondaryBtn" name="action" value="dismiss">Оставить</button>
          </form>
        </section>
      )}

      <details className="secondaryDisclosure coachExtras top">
        <summary>
          <span><b>Дополнительные настройки</b><small>Память, недельный check-in и быстрые ситуации</small></span>
          <ChevronDown size={18} />
        </summary>
        <div className="disclosureBody">
          <div className="premiumCoachGrid top">
            <section className="card">
              <div className="sectionTitleRow"><div><h2>Память о тебе</h2><span className="muted">Только устойчивые предпочтения</span></div><BrainCircuit /></div>
              <div className="memoryList">
                {intelligence.clientMemory.slice(0, 8).map((item: any) => (
                  <div key={item.id}>
                    <span><b>{item.memory_value}</b><small>{item.memory_type} · {item.source}</small></span>
                    <em>{Math.round(Number(item.confidence) * 100)}%</em>
                  </div>
                ))}
                {!intelligence.clientMemory.length && <p className="muted">Оценивай рекомендации — память будет адаптироваться.</p>}
              </div>
            </section>

            <section className="card">
              <div className="sectionTitleRow"><div><h2>Недельный check-in</h2><span className="muted">Голод, энергия и сложность соблюдения</span></div><Activity /></div>
              <form className="checkinForm" action="/api/premium/checkin" method="post">
                <label>Голод<select name="hunger" defaultValue={checkin?.hunger || "normal"}><option value="low">Низкий</option><option value="normal">Нормальный</option><option value="high">Высокий</option></select></label>
                <label>Энергия<select name="energy" defaultValue={checkin?.energy || "normal"}><option value="low">Низкая</option><option value="normal">Нормальная</option><option value="high">Высокая</option></select></label>
                <label>Соблюдать питание<select name="adherence_ease" defaultValue={checkin?.adherence_ease || "normal"}><option value="easy">Легко</option><option value="normal">Нормально</option><option value="hard">Сложно</option></select></label>
                <textarea name="note" placeholder="Комментарий — необязательно" defaultValue={checkin?.note || ""} />
                <button className="primary">Сохранить check-in</button>
              </form>
            </section>
          </div>

          <section className="card top">
            <div className="sectionTitleRow"><div><h2>Быстрые ситуации</h2><span className="muted">Команды для Telegram</span></div></div>
            <div className="premiumScenarios">
              <Scenario icon={<UtensilsCrossed />} cmd="/recommend" title="Что лучше сейчас" text="Главная рекомендация." />
              <Scenario icon={<ShoppingBasket />} cmd="/shop" title="Я в магазине" text="Корзина под остаток дня." />
              <Scenario icon={<Store />} cmd="/restaurant" title="Я в ресторане" text="Что заказать." />
              <Scenario icon={<Timer />} cmd="/quick" title="Нет времени" text="Быстрые варианты." />
              <Scenario icon={<Flame />} cmd="/training" title="Тренировка" text="Питание под нагрузку." />
              <Scenario icon={<MessageCircleMore />} cmd="/sweet" title="Хочу сладкое" text="Встроить десерт." />
              <Scenario icon={<BrainCircuit />} cmd="/overate" title="Переел" text="Спокойно скорректировать день." />
              <Scenario icon={<HelpCircle />} cmd="/why" title="Почему?" text="Объяснить совет." />
            </div>
          </section>
        </div>
      </details>
    </>
  );
}

function dayPacing(eaten: number, target: number, pacing?: any) {
  if (!target) return { title: "Цель дня не задана", detail: "Заполни нормы в профиле." };
  const share = Number(pacing?.eaten_share ?? eaten / target);
  const expected = Number(pacing?.expected_share ?? 0.5);
  if (Math.abs(share - expected) < 0.18) return { title: "День идёт по плану", detail: "Сейчас ничего специально корректировать не нужно." };
  if (share < expected) return { title: "Есть отставание по энергии", detail: "Лучше не оставлять слишком большой объём на поздний вечер." };
  return { title: "Темп выше обычного", detail: "Следующий приём можно сделать легче." };
}

function buildFocus(context: any, pacing: { title: string }) {
  const remaining = context.today?.remaining || {};
  const settings = context.settings || {};
  if (pacing.title === "День идёт по плану") return "Продолжай без лишних корректировок";
  if (Number(settings.protein_target || 0) && Number(remaining.protein || 0) > Number(settings.protein_target || 0) * 0.45) return "Сделай белок основой следующего приёма";
  return "Ориентируйся на голод и остаток дня";
}

function Scenario({ icon, cmd, title, text }: { icon: React.ReactNode; cmd: string; title: string; text: string }) {
  return <div className="premiumScenario"><i>{icon}</i><span><code>{cmd}</code><b>{title}</b><small>{text}</small></span></div>;
}

function buildStarterPlan(context: any, pacing: { title: string }) {
  const remaining = context.today?.remaining || {};
  const settings = context.settings || {};
  const foods = Array.isArray(context.today?.foods) ? context.today.foods : [];
  const kcal = Math.max(0, Math.round(Number(remaining.kcal || 0)));
  const protein = Math.max(0, Math.round(Number(remaining.protein || 0)));

  if (!Number(settings.kcal_target || 0)) return "Заполни дневную цель по калориям в профиле — после этого TeddY сразу распределит остаток дня.";
  if (!foods.length) return `Начни с полноценного приёма пищи. На день осталось около ${kcal} ккал${Number(settings.protein_target || 0) ? ` и ${protein} г белка` : ""}.`;
  if (pacing.title === "Есть отставание по энергии") return `Не откладывай питание на поздний вечер. На остаток дня около ${kcal} ккал${Number(settings.protein_target || 0) ? ` и ${protein} г белка` : ""}.`;
  if (pacing.title === "Темп выше обычного") return `Следующий приём сделай легче, но не урезай белок. Остаток — около ${kcal} ккал${Number(settings.protein_target || 0) ? ` и ${protein} г белка` : ""}.`;
  return `Продолжай текущий темп. На остаток дня около ${kcal} ккал${Number(settings.protein_target || 0) ? ` и ${protein} г белка` : ""}.`;
}

function buildWeeklyFocus(context: any): { title: string; text: string; note: string } {
  const quality = context.data_quality || {};
  const days = Number(quality.active_days_7 ?? quality.active_days ?? 0);
  const settings = context.settings || {};
  const averages = context.averages_7 || context.averages || {};

  if (days <= 0) return {
    title: "Собрать первый рабочий ритм",
    text: "Фиксируй обычное питание без попыток есть идеально. Каждый новый день делает рекомендации точнее.",
    note: "Premium работает уже сейчас, но пока делает осторожные выводы.",
  };
  if (days < 3) return {
    title: "Стабилизировать базовый режим",
    text: "Главная задача — получить несколько обычных дней питания и понять реальный ритм.",
    note: `Есть ${days} дн. данных.`,
  };
  if (days < 7) {
    const target = Number(settings.kcal_target || 0);
    const averageKcal = Number(averages.kcal || 0);
    const difference = target && averageKcal ? Math.round(averageKcal - target) : 0;
    return {
      title: Math.abs(difference) > Math.max(150, target * 0.08)
        ? difference > 0 ? "Сгладить систематический избыток" : "Не допускать систематического недобора"
        : "Закрепить стабильность рациона",
      text: target && averageKcal
        ? `По имеющимся дням среднее около ${Math.round(averageKcal)} ккал при цели ${Math.round(target)}.`
        : "Продолжай фиксировать питание и держать понятный ритм приёмов пищи.",
      note: `Есть ${days} дн. данных. Полная недельная уверенность появится с 7 активных дней.`,
    };
  }
  return {
    title: "Удерживать устойчивый недельный ритм",
    text: "Неделя данных уже есть. TeddY может увереннее сравнивать питание, вес и повторяющиеся привычки.",
    note: "Фокус опирается на полноценное недельное окно.",
  };
}
