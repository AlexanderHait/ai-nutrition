import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import { requireClient } from "@/lib/auth";
import { clientPremiumAccountData, premiumIntelligenceAccountData } from "@/lib/account-data";
import { subscriptionAccess } from "@/lib/subscription-access";
import { fmt } from "@/lib/data";
import SimplifiedSections from "@/components/SimplifiedSections";
import MichelinSections from "@/components/MichelinSections";

export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return String(value || "")
    .replace(/\\([_*`])/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; feedback?: string; checkin?: string }>;
}) {
  const session = await requireClient();
  const query = await searchParams;
  const access = await subscriptionAccess(session.accountId!);
  if (!access.premium) redirect("/client/plan");

  const [data, intelligence] = await Promise.all([
    clientPremiumAccountData(session.accountId!),
    premiumIntelligenceAccountData(session.accountId!),
  ]);

  const context: any = intelligence.context || {};
  const today = context.today || {};
  const eaten = today.eaten || {};
  const remaining = today.remaining || {};
  const settings = context.settings || {};
  const latest = intelligence.recommendations?.[0];
  const checkin = intelligence.checkins?.[0];

  const dailyPlan = data.plan?.content_md
    ? clean(data.plan.content_md)
    : Number(settings.kcal_target || 0)
      ? `На остаток дня около ${Math.max(0, Math.round(Number(remaining.kcal || 0)))} ккал${Number(settings.protein_target || 0) ? ` и ${Math.max(0, Math.round(Number(remaining.protein || 0)))} г белка` : ""}. Распредели их спокойно, без резких компенсаций.`
      : "Заполни дневную цель в профиле — после этого TeddY сразу соберёт конкретный план дня.";

  const weeklyFocus = data.report?.content_md
    ? clean(data.report.content_md)
    : "Сохраняй обычный ритм питания и фиксируй реальные приёмы пищи. TeddY будет усиливать рекомендации по мере накопления данных.";

  const nextStep = Number(remaining.protein || 0) >= 25
    ? "Сделай белок основой следующего приёма"
    : Number(remaining.kcal || 0) < 0
      ? "Следующий приём сделай легче, но не компенсируй голоданием"
      : "Продолжай обычный режим без лишних корректировок";

  return (
    <>
      <SimplifiedSections />
      <MichelinSections />

      <div className="pageHead">
        <div>
          <p>Premium</p>
          <h1>Твой нутрициолог</h1>
          <span>Только решения: что делать сегодня, на чём сосредоточиться и почему.</span>
        </div>
        <Link className="secondaryBtn" href="/client">← Сегодня</Link>
      </div>

      {(query.saved || query.feedback || query.checkin) ? (
        <div className="successNotice"><CheckCircle2 size={16} />Сохранено. TeddY учтёт это в следующих рекомендациях.</div>
      ) : null}

      <section className="coachDecision">
        <i><UtensilsCrossed size={21} /></i>
        <div>
          <small>Следующее действие</small>
          <h2>{nextStep}</h2>
          <p>Сегодня съедено {fmt(Number(eaten.kcal || 0))} ккал. Остаток — около {fmt(Math.max(0, Number(remaining.kcal || 0)))} ккал.</p>
        </div>
      </section>

      <div className="coachWorkGrid top">
        <section className="card">
          <div className="sectionTitleRow"><div><h2>План на сегодня</h2><span className="muted">Конкретный ориентир без лишних расчётов</span></div><Sparkles size={18} /></div>
          <div className="coachText">{dailyPlan}</div>
        </section>

        <section className="card">
          <div className="sectionTitleRow"><div><h2>Фокус недели</h2><span className="muted">Одна главная задача вместо длинного списка</span></div><Target size={18} /></div>
          <div className="coachText">{weeklyFocus}</div>
        </section>
      </div>

      {latest ? (
        <section className="card top">
          <div className="sectionTitleRow"><div><h2>Последняя рекомендация</h2><span className="muted">Можно отметить, насколько она подошла</span></div></div>
          <p className="coachText">{clean(latest.recommendation_text)}</p>
          {!latest.feedback ? (
            <form action="/api/premium/feedback" method="post" className="coachFeedback">
              <input type="hidden" name="id" value={latest.id} />
              <button name="feedback" value="useful" className="secondaryBtn">Полезно</button>
              <select name="reason" defaultValue="">
                <option value="">Почему не подходит — необязательно</option>
                <option>Не люблю эти продукты</option>
                <option>Слишком дорого</option>
                <option>Нет времени готовить</option>
                <option>Слишком большой объём</option>
                <option>Другое</option>
              </select>
              <button name="feedback" value="not_fit" className="secondaryBtn">Не подходит</button>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className="card top">
        <div className="sectionTitleRow"><div><h2>Как ты себя чувствуешь</h2><span className="muted">Голод, энергия и сложность соблюдения помогают точнее корректировать план</span></div><Activity size={18} /></div>
        <form className="checkinForm coachCheckin" action="/api/premium/checkin" method="post">
          <label>Голод<select name="hunger" defaultValue={checkin?.hunger || "normal"}><option value="low">Низкий</option><option value="normal">Нормальный</option><option value="high">Высокий</option></select></label>
          <label>Энергия<select name="energy" defaultValue={checkin?.energy || "normal"}><option value="low">Низкая</option><option value="normal">Нормальная</option><option value="high">Высокая</option></select></label>
          <label>Соблюдать питание<select name="adherence_ease" defaultValue={checkin?.adherence_ease || "normal"}><option value="easy">Легко</option><option value="normal">Нормально</option><option value="hard">Сложно</option></select></label>
          <textarea name="note" placeholder="Комментарий — необязательно" defaultValue={checkin?.note || ""} />
          <button className="primary">Сохранить</button>
        </form>
      </section>

      <section className="coachSituations top">
        <Link href="/client/nutrition"><span><b>Что поесть сейчас</b><small>Посмотреть остаток и сегодняшний рацион</small></span><ChevronRight size={17} /></Link>
        <Link href="/client/progress"><span><b>Почему меняется вес</b><small>Сравнить питание и динамику</small></span><ChevronRight size={17} /></Link>
        <Link href="/client/profile"><span><b>Изменить цель</b><small>Вес, калории и КБЖУ</small></span><ChevronRight size={17} /></Link>
      </section>
    </>
  );
}
