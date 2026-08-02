import Link from "next/link";
import { Activity, Scale, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import { requireClient } from "@/lib/auth";
import { clientProgressData, dayKey, fmt, mealDay, mealSessions, sumMeals } from "@/lib/data";
import { coachScore } from "@/lib/coach-score";
import { subscriptionAccess } from "@/lib/subscription-access";
import CoachScoreCard from "@/components/CoachScoreCard";

export const dynamic="force-dynamic";

function clean(text:string){return String(text||"").replace(/\\([_*`])/g,"$1").replace(/\*\*(.*?)\*\*/g,"$1").replace(/\*(.*?)\*/g,"$1").replace(/_(.*?)_/g,"$1").replace(/`(.*?)`/g,"$1")}

export default async function Page(){
  const s=await requireClient();
  const [d,score,access]=await Promise.all([
    clientProgressData(s.chatId!),
    coachScore(s.chatId!),
    subscriptionAccess(s.chatId!),
  ]);
  const target=Number(d.settings?.kcal_target||2000);
  const targetWeight=Number(d.settings?.target_weight_kg||0);

  const days=Array.from({length:14},(_,i)=>{
    const date=new Date();date.setDate(date.getDate()-(13-i));
    const day=dayKey(date),rows=d.meals.filter(m=>mealDay(m)===day);
    return{day,total:sumMeals(rows),sessions:mealSessions(rows).length};
  });
  const week=days.slice(-7),complete=week.filter(x=>x.sessions>0);
  const avg=complete.length?Math.round(complete.reduce((a,x)=>a+x.total.kcal,0)/complete.length):0;
  const adherence=target&&complete.length?Math.round(complete.filter(x=>Math.abs(x.total.kcal-target)<=target*.12).length/complete.length*100):0;

  const latest=d.weights?.[0],previous=d.weights?.[1];
  const delta=latest&&previous?Number(latest.weight_kg)-Number(previous.weight_kg):null;
  const max=Math.max(target,1,...days.map(x=>x.total.kcal));
  const latestData=d.meals?.[0]?.eaten_at||d.weights?.[0]?.measured_at;
  const premium=access.premium;

  return <>
    <div className="pageHead"><div><p>Динамика</p><h1>Прогресс</h1><span>Главное за неделю и тренды за 14 дней.</span></div></div>

    <div className="dataFreshnessBar"><span>Актуальность данных</span><b>{latestData?new Date(latestData).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Moscow"}):"нет данных"}</b></div>
    <div className="progressHeroStats">
      <Metric icon={<Activity/>} label="Средние калории" value={avg?`${fmt(avg)} ккал`:"—"} sub={target?`цель ${fmt(target)} ккал`:"цель не задана"}/>
      <Metric icon={<Target/>} label="Дней с рационом" value={`${complete.length} / 7`} sub="за последние 7 дней"/>
      <Metric icon={delta!==null&&delta<=0?<TrendingDown/>:<TrendingUp/>} label="Изменение веса" value={delta!==null?`${delta>0?"+":""}${fmt(delta,1)} кг`:"—"} sub="к предыдущему измерению"/>
      <Metric icon={<Sparkles/>} label="Попадание в цель" value={complete.length?`${adherence}%`:"—"} sub="±12% от калорийности"/>
    </div>

    <div className="top"><CoachScoreCard score={score}/></div>

    <div className="clientProgressGrid top">
      <section className="card progressChartCard">
        <div className="sectionTitleRow"><div><h2>Калории · 14 дней</h2><span className="muted">Нажми на столбец — откроется рацион дня</span></div><b className="chartAverage">Ø {avg||"—"}</b></div>
        <div className="client14Chart">
          {days.map(x=><Link href={`/client/nutrition?day=${x.day}#day-${x.day}`} className="client14Col" key={x.day}>
            <span>{x.total.kcal?fmt(x.total.kcal):""}</span>
            <div><i style={{height:`${Math.max(3,x.total.kcal/max*100)}%`}}/>{target>0&&<em style={{bottom:`${Math.min(100,target/max*100)}%`}}/>}</div>
            <small>{new Date(x.day+"T12:00:00").toLocaleDateString("ru-RU",{day:"2-digit"})}</small>
          </Link>)}
        </div>
      </section>

      <section className="card weightProgressCard">
        <div className="sectionTitleRow"><div><h2>Вес</h2><span className="muted">Последние измерения</span></div><Scale size={19}/></div>
        {latest?<><div className="weightBig"><b>{fmt(latest.weight_kg,1)}</b><span>кг</span></div>
          {targetWeight>0&&<div className="weightGoalLine"><span>До цели</span><b>{fmt(Math.abs(Number(latest.weight_kg)-targetWeight),1)} кг</b></div>}
          <div className="weightHistory modern">{d.weights.slice(0,7).map((w:any,i:number)=><div className="row" key={w.id}><span>{new Date(w.measured_at).toLocaleDateString("ru-RU",{day:"2-digit",month:"short"})}</span><b>{fmt(w.weight_kg,1)} кг</b>{i===0&&<em>сейчас</em>}</div>)}</div>
        </>:<div className="clientEmptyNice compact"><Scale/><b>Нет измерений</b><span>Добавь вес в профиле — здесь появится динамика.</span></div>}
      </section>
    </div>

    {premium?<section className="card top">
      <div className="sectionTitleRow"><div><h2>Premium AI‑отчёты</h2><span className="muted">Разбор сохранённого питания и динамики</span></div><Sparkles size={19}/></div>
      <div className="digestTimeline">
        {d.digests.slice(0,10).map((x:any)=><details className="digestItem modern" key={x.id}>
          <summary><div><b>{new Date(x.for_date+"T12:00:00").toLocaleDateString("ru-RU",{day:"numeric",month:"long"})}</b><small>{fmt(x.kcal)} ккал</small></div><span>Открыть</span></summary>
          <div className="digest">{clean(x.summary_md)}</div>
        </details>)}
      </div>
      {!d.digests.length&&<div className="clientEmptyNice compact"><Sparkles/><b>Отчётов пока нет</b><span>Они появятся после накопления данных.</span></div>}
    </section>:<Link href="/client/plan" className="premiumProgressTeaser"><Sparkles/><span><b>Premium анализирует не только цифры</b><small>Недельная стратегия, динамика веса, персональные рекомендации и корректировка целей.</small></span><strong>Узнать больше →</strong></Link>}
  </>;
}
function Metric({icon,label,value,sub}:{icon:React.ReactNode;label:string;value:string;sub:string}){return <div className="clientMetricCard"><i>{icon}</i><span><small>{label}</small><b>{value}</b><em>{sub}</em></span></div>}
