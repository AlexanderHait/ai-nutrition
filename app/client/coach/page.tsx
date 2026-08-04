import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Gauge,
  History,
  Scale,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { requireClient } from "@/lib/auth";
import {
  clientPremiumAccountData,
  premiumIntelligenceAccountData,
} from "@/lib/account-data";
import { subscriptionAccess } from "@/lib/subscription-access";
import { fmt } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function clean(value: unknown) {
  return String(value || "")
    .replace(/\\([_*`])/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

function shortText(value: string, limit = 420) {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trim()}…`;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; feedback?: string; checkin?: string }>;
}) {
  const current = await requireClient();
  const query = await searchParams;
  const access = await subscriptionAccess(current.accountId!);
  if (!access.premium) redirect("/client/plan");

  const [data, intelligence] = await Promise.all([
    clientPremiumAccountData(current.accountId!),
    premiumIntelligenceAccountData(current.accountId!),
  ]);

  const context: any = intelligence.context || {};
  const today = context.today || {};
  const eaten = today.eaten || {};
  const remaining = today.remaining || {};
  const settings = context.settings || {};
  const latest = intelligence.recommendations?.[0];
  const checkin = intelligence.checkins?.[0];

  const kcalTarget = Math.max(0, Number(settings.kcal_target || today.target?.kcal || 0));
  const proteinTarget = Math.max(0, Number(settings.protein_target || today.target?.protein || 0));
  const eatenKcal = Math.max(0, Number(eaten.kcal || 0));
  const eatenProtein = Math.max(0, Number(eaten.protein || 0));
  const remainingKcal = Math.max(0, Number(remaining.kcal ?? kcalTarget - eatenKcal));
  const remainingProtein = Math.max(0, Number(remaining.protein ?? proteinTarget - eatenProtein));
  const kcalProgress = kcalTarget ? Math.min(100, Math.round((eatenKcal / kcalTarget) * 100)) : 0;
  const proteinProgress = proteinTarget ? Math.min(100, Math.round((eatenProtein / proteinTarget) * 100)) : 0;
  const weightCount = Number(context.weight_trend?.count || context.data_quality?.weight_count || 0);
  const currentWeight = Number(context.weight_trend?.current || context.weight_trend?.latest || 0);

  const dailyPlan = shortText(
    data.plan?.content_md
      ? clean(data.plan.content_md)
      : kcalTarget
        ? `На остаток дня около ${fmt(remainingKcal)} ккал${proteinTarget ? ` и ${fmt(remainingProtein)} г белка` : ""}. Распредели их между привычными приёмами пищи без резких компенсаций.`
        : "Заполни дневную цель в профиле — после этого TeddY сразу соберёт конкретный план дня.",
  );

  const weeklyFocus = shortText(
    data.report?.content_md
      ? clean(data.report.content_md)
      : "Сохраняй обычный ритм питания и фиксируй реальные приёмы пищи. Чем стабильнее записи, тем точнее рекомендации.",
    360,
  );

  const nextStep = remainingProtein >= 25
    ? "Сделай белок основой следующего приёма"
    : remainingKcal <= 0 && kcalTarget > 0
      ? "Остановись на обычном лёгком приёме без голодания"
      : "Продолжай привычный режим без лишних корректировок";

  const statusTone = remainingKcal > Math.max(600, kcalTarget * 0.3) ? "warning" : "good";

  return (
    <div className="coachProductPage">
      <style>{`
        .coachProductPage{display:grid;gap:14px;width:100%;min-width:0;overflow:hidden;padding-bottom:8px}
        .coachProductPage *{box-sizing:border-box;min-width:0}
        .coachHeroNew{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start;padding:4px 2px 2px}
        .coachEyebrow{margin:0 0 7px;color:var(--gold2);font-size:12px;font-weight:850;letter-spacing:.15em;text-transform:uppercase}
        .coachHeroNew h1{margin:0;color:var(--text);font-size:clamp(30px,5vw,43px);line-height:1.02;letter-spacing:-1.25px}
        .coachHeroNew p:last-child{margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.5}
        .coachSettingsButton{display:grid;place-items:center;width:44px;height:44px;border:1px solid var(--line2);border-radius:14px;background:var(--surface);color:var(--text)}
        .coachPrimaryCard,.coachMetric,.coachContentCard,.coachQuickLink{border:1px solid var(--line);background:var(--surface);box-shadow:var(--shadow)}
        .coachPrimaryCard{position:relative;overflow:hidden;padding:20px;border-radius:22px;background:linear-gradient(145deg,var(--surface),var(--accent-soft))}
        .coachPrimaryCard:after{content:"";position:absolute;width:180px;height:180px;right:-70px;top:-90px;border-radius:50%;background:color-mix(in srgb,var(--gold) 12%,transparent);pointer-events:none}
        .coachPrimaryTop{display:flex;align-items:center;justify-content:space-between;gap:12px;position:relative;z-index:1}
        .coachPrimaryTop span{display:inline-flex;align-items:center;gap:7px;color:var(--gold2);font-size:12px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}
        .coachPrimaryTop b{padding:6px 9px;border-radius:999px;background:var(--surface-soft);color:var(--muted);font-size:11px}
        .coachPrimaryCard h2{position:relative;z-index:1;margin:17px 0 7px;max-width:680px;color:var(--text);font-size:clamp(22px,4vw,30px);line-height:1.18;letter-spacing:-.55px}
        .coachPrimaryCard>p{position:relative;z-index:1;margin:0;color:var(--muted);font-size:14px;line-height:1.55}
        .coachPrimaryActions{position:relative;z-index:1;display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}
        .coachPrimaryActions a{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:0 15px;border-radius:13px;font-size:13px;font-weight:800}
        .coachPrimaryActions a:first-child{background:linear-gradient(135deg,#e6ca73,#cfa748);color:#16201d}
        .coachPrimaryActions a:last-child{border:1px solid var(--line2);background:var(--surface);color:var(--text)}
        .coachMetrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
        .coachMetric{padding:15px;border-radius:17px}
        .coachMetricHead{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--muted);font-size:12px}
        .coachMetricHead svg{color:var(--gold2)}
        .coachMetric strong{display:block;margin-top:9px;color:var(--text);font-size:20px;line-height:1.15}
        .coachMetric small{display:block;margin-top:4px;color:var(--muted);font-size:12px;line-height:1.4}
        .coachProgress{height:6px;margin-top:12px;overflow:hidden;border-radius:99px;background:var(--surface-soft)}
        .coachProgress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#d2aa50,#ead17d)}
        .coachDashboard{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(280px,.88fr);gap:10px;align-items:start}
        .coachColumn{display:grid;gap:10px}
        .coachContentCard{padding:18px;border-radius:19px}
        .coachCardHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:13px}
        .coachCardHead h2{margin:0;color:var(--text);font-size:17px;line-height:1.25}
        .coachCardHead p{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.4}
        .coachCardHead>i{display:grid;place-items:center;width:38px;height:38px;flex:0 0 auto;border-radius:12px;background:var(--accent-soft);color:var(--gold2)}
        .coachReadable{color:var(--text);font-size:14px;line-height:1.68;white-space:pre-wrap;overflow-wrap:anywhere}
        .coachRisk{display:grid;grid-template-columns:38px minmax(0,1fr);gap:11px;align-items:start;padding:13px;border-radius:14px;background:var(--surface-soft)}
        .coachRisk i{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:var(--accent-soft);color:var(--gold2)}
        .coachRisk b{display:block;color:var(--text);font-size:13px}.coachRisk span{display:block;margin-top:3px;color:var(--muted);font-size:12px;line-height:1.45}
        .coachRisk.warning i{color:#d39a4e}.coachRisk.good i{color:#71aa88}
        .coachQuickGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
        .coachQuickLink{display:grid;grid-template-columns:38px minmax(0,1fr) 16px;gap:10px;align-items:center;padding:13px;border-radius:15px}
        .coachQuickLink i{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:var(--surface-soft);color:var(--gold2)}
        .coachQuickLink b{display:block;color:var(--text);font-size:13px}.coachQuickLink small{display:block;margin-top:2px;color:var(--muted);font-size:11px;line-height:1.35}.coachQuickLink>svg{color:var(--muted)}
        .coachCheckin{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
        .coachCheckin label{display:grid;gap:6px;color:var(--muted);font-size:12px}.coachCheckin textarea,.coachCheckin button{grid-column:1/-1}.coachCheckin textarea{min-height:82px}
        .coachFeedback{display:grid;grid-template-columns:auto minmax(160px,1fr) auto;gap:8px;margin-top:14px}
        @media(max-width:900px){.coachDashboard{grid-template-columns:1fr}.coachMetrics{grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media(max-width:600px){
          .coachProductPage{gap:11px}
          .coachHeroNew{padding-top:2px}.coachHeroNew h1{font-size:30px}.coachHeroNew p:last-child{font-size:13px}
          .coachPrimaryCard{padding:17px;border-radius:19px}.coachPrimaryCard h2{font-size:23px;margin-top:15px}.coachPrimaryActions{display:grid;grid-template-columns:1fr 1fr}.coachPrimaryActions a{padding:0 9px}
          .coachMetrics{grid-template-columns:1fr 1fr}.coachMetric:last-child{grid-column:1/-1}.coachMetric{padding:13px}.coachMetric strong{font-size:17px}
          .coachContentCard{padding:16px;border-radius:17px}.coachQuickGrid{grid-template-columns:1fr 1fr}
          .coachCheckin,.coachFeedback{grid-template-columns:1fr}.coachCheckin textarea,.coachCheckin button{grid-column:1}
        }
        @media(max-width:380px){.coachPrimaryActions,.coachQuickGrid{grid-template-columns:1fr}.coachMetrics{grid-template-columns:1fr}.coachMetric:last-child{grid-column:auto}}
      `}</style>

      <header className="coachHeroNew">
        <div>
          <p className="coachEyebrow">Premium Coach</p>
          <h1>Твой нутрициолог</h1>
          <p>Одно главное решение на сегодня — без перегруженного дашборда.</p>
        </div>
        <Link className="coachSettingsButton" href="/client/profile" aria-label="Настройки Coach">
          <Settings2 size={20} />
        </Link>
      </header>

      {(query.saved || query.feedback || query.checkin) ? (
        <div className="successNotice"><CheckCircle2 size={16} /> Сохранено. TeddY учтёт это в следующих рекомендациях.</div>
      ) : null}

      <section className="coachPrimaryCard">
        <div className="coachPrimaryTop">
          <span><Sparkles size={16} /> Главная задача</span>
          <b>{statusTone === "warning" ? "Требует внимания" : "Всё по плану"}</b>
        </div>
        <h2>{nextStep}</h2>
        <p>Ориентир на остаток дня: {fmt(remainingKcal)} ккал и {fmt(remainingProtein)} г белка.</p>
        <div className="coachPrimaryActions">
          <Link href="/client/nutrition"><UtensilsCrossed size={17} /> Добавить еду</Link>
          <Link href="/client"><Gauge size={17} /> Сегодня</Link>
        </div>
      </section>

      <section className="coachMetrics" aria-label="Прогресс дня">
        <article className="coachMetric">
          <div className="coachMetricHead"><span>Калории</span><Gauge size={16} /></div>
          <strong>{fmt(eatenKcal)} / {fmt(kcalTarget || remainingKcal)}</strong>
          <small>{fmt(remainingKcal)} ккал осталось</small>
          <div className="coachProgress"><i style={{ width: `${kcalProgress}%` }} /></div>
        </article>
        <article className="coachMetric">
          <div className="coachMetricHead"><span>Белок</span><UtensilsCrossed size={16} /></div>
          <strong>{fmt(eatenProtein)} / {fmt(proteinTarget || remainingProtein)} г</strong>
          <small>{fmt(remainingProtein)} г осталось</small>
          <div className="coachProgress"><i style={{ width: `${proteinProgress}%` }} /></div>
        </article>
        <article className="coachMetric">
          <div className="coachMetricHead"><span>Вес</span><Scale size={16} /></div>
          <strong>{currentWeight ? `${fmt(currentWeight)} кг` : `${weightCount} измерений`}</strong>
          <small>{weightCount >= 7 ? "Данных достаточно для динамики" : "Добавляй вес регулярно"}</small>
        </article>
      </section>

      <div className="coachDashboard">
        <div className="coachColumn">
          <section className="coachContentCard">
            <div className="coachCardHead"><div><h2>План на сегодня</h2><p>Коротко и по делу</p></div><i><Target size={18} /></i></div>
            <div className="coachReadable">{dailyPlan}</div>
          </section>

          <section className="coachContentCard">
            <div className="coachCardHead"><div><h2>Фокус недели</h2><p>Одна задача, которая даст результат</p></div><i><TrendingUp size={18} /></i></div>
            <div className="coachReadable">{weeklyFocus}</div>
          </section>

          {latest ? (
            <section className="coachContentCard">
              <div className="coachCardHead"><div><h2>Последняя рекомендация</h2><p>Помоги TeddY стать точнее</p></div><i><Sparkles size={18} /></i></div>
              <div className="coachReadable">{shortText(clean(latest.recommendation_text), 500)}</div>
              {!latest.feedback ? (
                <form action="/api/premium/feedback" method="post" className="coachFeedback">
                  <input type="hidden" name="id" value={latest.id} />
                  <button name="feedback" value="useful" className="secondaryBtn">Полезно</button>
                  <select name="reason" defaultValue=""><option value="">Причина — необязательно</option><option>Не люблю эти продукты</option><option>Слишком дорого</option><option>Нет времени готовить</option><option>Слишком большой объём</option><option>Другое</option></select>
                  <button name="feedback" value="not_fit" className="secondaryBtn">Не подходит</button>
                </form>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="coachColumn">
          <section className="coachContentCard">
            <div className="coachCardHead"><div><h2>Статус</h2><p>Что важно сейчас</p></div><i><CircleAlert size={18} /></i></div>
            <div className={`coachRisk ${statusTone}`}><i><CircleAlert size={18} /></i><div><b>{statusTone === "warning" ? "Есть отставание по энергии" : "День идёт по плану"}</b><span>{statusTone === "warning" ? `Осталось около ${fmt(remainingKcal)} ккал. Не оставляй весь объём на поздний вечер.` : "Продолжай привычный ритм и фиксируй приёмы пищи."}</span></div></div>
            <div className={`coachRisk ${weightCount >= 7 ? "good" : "warning"}`} style={{ marginTop: 9 }}><i><Scale size={18} /></i><div><b>{weightCount >= 7 ? "Вес отслеживается" : "Мало измерений веса"}</b><span>{weightCount >= 7 ? "Динамика уже достаточно надёжная." : `Сейчас доступно ${weightCount} измерений. Добавь ещё несколько.`}</span></div></div>
          </section>

          <nav className="coachQuickGrid" aria-label="Быстрые действия">
            <Link className="coachQuickLink" href="/client/nutrition"><i><UtensilsCrossed size={18} /></i><span><b>Питание</b><small>Добавить приём</small></span><ChevronRight size={15} /></Link>
            <Link className="coachQuickLink" href="/client/progress"><i><TrendingUp size={18} /></i><span><b>Прогресс</b><small>Графики и вес</small></span><ChevronRight size={15} /></Link>
            <Link className="coachQuickLink" href="/client/history"><i><History size={18} /></i><span><b>История</b><small>Прошлые дни</small></span><ChevronRight size={15} /></Link>
            <Link className="coachQuickLink" href="/client/profile"><i><Settings2 size={18} /></i><span><b>Настройки</b><small>Цели и КБЖУ</small></span><ChevronRight size={15} /></Link>
          </nav>

          <section className="coachContentCard">
            <div className="coachCardHead"><div><h2>Самочувствие</h2><p>Три ответа улучшают рекомендации</p></div><i><Activity size={18} /></i></div>
            <form className="coachCheckin" action="/api/premium/checkin" method="post">
              <label>Голод<select name="hunger" defaultValue={checkin?.hunger || "normal"}><option value="low">Низкий</option><option value="normal">Нормальный</option><option value="high">Высокий</option></select></label>
              <label>Энергия<select name="energy" defaultValue={checkin?.energy || "normal"}><option value="low">Низкая</option><option value="normal">Нормальная</option><option value="high">Высокая</option></select></label>
              <label>Соблюдение<select name="adherence_ease" defaultValue={checkin?.adherence_ease || "normal"}><option value="easy">Легко</option><option value="normal">Нормально</option><option value="hard">Сложно</option></select></label>
              <textarea name="note" placeholder="Комментарий — необязательно" defaultValue={checkin?.note || ""} />
              <button className="primary">Сохранить</button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
