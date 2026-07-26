import Link from "next/link";
import { Activity, BadgeRussianRuble, BookOpenCheck, Crown, Database, Target, UserCheck, Users } from "lucide-react";
import { allData, dayKey, fmt, goalKind, mealDay, mealSessions } from "@/lib/data";
export const dynamic="force-dynamic";

const DAY=86400000;

export default async function Page(){
  const {profiles,meals,logs,settings,subscriptions,payments,catalog}=await allData();
  const now=Date.now(),week=now-7*DAY,month=now-30*DAY;

  const activity=new Map<number,number>();
  for(const m of meals){
    const id=Number(m.chat_id),ts=new Date(m.eaten_at).getTime();
    activity.set(id,Math.max(activity.get(id)||0,ts));
  }
  for(const l of logs as any[]){
    const id=Number(l.chat_id),ts=new Date(l.created_at).getTime();
    activity.set(id,Math.max(activity.get(id)||0,ts));
  }

  const byClientMeals=new Map<number,typeof meals>();
  for(const m of meals){
    const id=Number(m.chat_id);
    if(!byClientMeals.has(id))byClientMeals.set(id,[]);
    byClientMeals.get(id)!.push(m);
  }

  const active7=[...activity.values()].filter(x=>x>=week).length;
  const active30=[...activity.values()].filter(x=>x>=month).length;

  const withFirstMeal=profiles.filter(p=>(byClientMeals.get(Number(p.telegram_id))||[]).length>0).length;
  const activated3=profiles.filter(p=>{
    const days=new Set((byClientMeals.get(Number(p.telegram_id))||[]).map(mealDay));
    return days.size>=3;
  }).length;

  const eligibleD7=profiles.filter(p=>new Date(p.created_at).getTime()<=now-7*DAY);
  const retainedD7=eligibleD7.filter(p=>{
    const start=new Date(p.created_at).getTime()+7*DAY;
    return (byClientMeals.get(Number(p.telegram_id))||[]).some(m=>new Date(m.eaten_at).getTime()>=start);
  }).length;

  const latest=new Map<number,any>();
  for(const x of subscriptions as any[])if(!latest.has(Number(x.chat_id)))latest.set(Number(x.chat_id),x);
  const activeSubs=[...latest.values()].filter(x=>x?.status==="active");
  const basic=activeSubs.filter(x=>x.plan==="basic").length;
  const premium=activeSubs.filter(x=>x.plan==="premium").length;
  const subConversion=profiles.length?Math.round(activeSubs.length/profiles.length*100):0;

  const paid30=(payments as any[]).filter(x=>{
    const ts=new Date(x.created_at).getTime();
    const status=String(x.status||"").toLowerCase();
    return ts>=month && (!status || ["paid","succeeded","success","completed"].includes(status));
  });
  const revenue30=paid30.reduce((a,x)=>a+Number(x.amount_rub||0),0);

  const goals=["Снижение веса","Набор массы","Поддержание","Цель не указана"];
  const gc:Record<string,number>=Object.fromEntries(goals.map(g=>[g,0]));
  for(const p of profiles){
    const st=(settings as any[]).find(x=>Number(x.chat_id)===Number(p.telegram_id));
    const g=goalKind(st?.goal);
    gc[g]=(gc[g]||0)+1;
  }

  const sessions7=mealSessions(meals.filter(m=>new Date(m.eaten_at).getTime()>=week)).length;
  const days=Array.from({length:14},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(13-i));
    const key=dayKey(d);
    const dayMeals=meals.filter(m=>mealDay(m)===key);
    return{
      key,
      label:d.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit"}),
      clients:profiles.filter(p=>dayKey(new Date(p.created_at))===key).length,
      sessions:mealSessions(dayMeals).length,
      active:new Set(dayMeals.map(m=>Number(m.chat_id))).size
    };
  });
  const maxSessions=Math.max(1,...days.map(x=>x.sessions));

  const inactive=profiles.map(p=>({p,last:activity.get(Number(p.telegram_id))||0}))
    .filter(x=>!x.last||x.last<now-3*DAY)
    .sort((a,b)=>a.last-b.last).slice(0,8);

  const topCatalog=[...(catalog as any[])].slice(0,8);
  const cacheUses=(catalog as any[]).reduce((a,x)=>a+Number(x.use_count||0),0);

  return <>
    <div className="pageHead"><div><p>AI‑Nutrition / Бизнес</p><h1>Аналитика</h1><span>Воронка, удержание, деньги, активность и накопленная база продуктов.</span></div></div>

    <div className="adminKpis growthKpis">
      <K icon={<Users/>} l="Клиенты" v={fmt(profiles.length)} sub={`${active30} активны за 30 дней`}/>
      <K icon={<BookOpenCheck/>} l="Первый приём" v={`${profiles.length?Math.round(withFirstMeal/profiles.length*100):0}%`} sub={`${withFirstMeal} дошли до первой записи`}/>
      <K icon={<UserCheck/>} l="Активированы" v={`${profiles.length?Math.round(activated3/profiles.length*100):0}%`} sub="3+ дней с рационом"/>
      <K icon={<Target/>} l="Вернулись после 7 дней" v={`${eligibleD7.length?Math.round(retainedD7/eligibleD7.length*100):0}%`} sub={`${retainedD7} из ${eligibleD7.length} зрелых клиентов`}/>
      <K icon={<Crown/>} l="Конверсия в подписку" v={`${subConversion}%`} sub={`${premium} Premium · ${basic} Basic`}/>
      <K icon={<BadgeRussianRuble/>} l="Оплаты за 30 дней" v={`${fmt(revenue30)} ₽`} sub={`${paid30.length} платёжных событий`}/>
    </div>

    <section className="card top funnelCard">
      <div className="sectionTitleRow"><div><h2>Воронка продукта</h2><span className="muted">Где теряются пользователи</span></div></div>
      <div className="funnelSteps">
        <F label="Регистрация" value={profiles.length} base={profiles.length}/>
        <F label="Первый приём" value={withFirstMeal} base={profiles.length}/>
        <F label="3 дня питания" value={activated3} base={profiles.length}/>
        <F label="Активная подписка" value={activeSubs.length} base={profiles.length}/>
      </div>
    </section>

    <div className="analyticsDashboard top">
      <section className="card wideChartCard">
        <div className="sectionTitleRow"><div><h2>Приёмы за 14 дней</h2><span className="muted">{sessions7} реальных приёмов за последние 7 дней</span></div></div>
        <div className="businessBars">
          {days.map(d=><div className="businessBar" key={d.key}>
            <span>{d.sessions||""}</span><div><i style={{height:`${Math.max(4,d.sessions/maxSessions*100)}%`}}/></div><small>{d.label}</small>
          </div>)}
        </div>
      </section>

      <section className="card">
        <div className="sectionTitleRow"><div><h2>Food Cache</h2><span className="muted">База, которая уменьшает повторные AI‑поиски</span></div><Database size={19}/></div>
        <div className="cacheHeadline"><b>{fmt((catalog as any[]).length)}</b><span>известных продуктов</span></div>
        <div className="cacheMeta">{fmt(cacheUses)} суммарных использований</div>
        <div className="cacheTop">
          {topCatalog.map((x:any)=><div key={x.id}><span>{x.display_name}</span><b>×{fmt(x.use_count)}</b></div>)}
          {!topCatalog.length&&<p className="muted">После миграции база начнёт обучаться на сохранённых приёмах.</p>}
        </div>
      </section>
    </div>

    <div className="analyticsDashboard top">
      <section className="card">
        <h2>Цели клиентов</h2>
        <div className="segmentList">{goals.map(g=><Segment key={g} label={g} value={gc[g]||0} total={profiles.length}/>)}</div>
      </section>
      <section className="card">
        <h2>Тарифы</h2>
        <div className="planOverview">
          <div><Crown/><b>{premium}</b><span>Premium</span></div>
          <div><Target/><b>{basic}</b><span>Basic</span></div>
          <div><Users/><b>{Math.max(0,profiles.length-activeSubs.length)}</b><span>Без активного</span></div>
        </div>
      </section>
    </div>

    <section className="card top">
      <div className="sectionTitleRow"><div><h2>Риск оттока</h2><span className="muted">Нет активности более 3 дней</span></div></div>
      {inactive.length?<div className="attentionList">{inactive.map(({p,last})=><Link className="attentionRow" href={`/admin/clients/${p.telegram_id}`} key={p.telegram_id}>
        <div><b>{p.first_name||p.username||p.telegram_id}</b><small>{p.username?`@${p.username}`:`ID ${p.telegram_id}`}</small></div>
        <span>{!last?"Активности ещё не было":`${Math.floor((now-last)/DAY)} дн. без активности`}</span>
      </Link>)}</div>:<p className="muted">Все клиенты активны.</p>}
    </section>
  </>;
}

function K({icon,l,v,sub}:{icon:React.ReactNode,l:string,v:string,sub:string}){return <div className="adminKpi"><i>{icon}</i><div><span>{l}</span><b>{v}</b><small>{sub}</small></div></div>}
function Segment({label,value,total}:{label:string,value:number,total:number}){const pct=total?Math.round(value/total*100):0;return <div className="segmentRow"><div><b>{label}</b><span>{value} · {pct}%</span></div><div><i style={{width:`${pct}%`}}/></div></div>}
function F({label,value,base}:{label:string,value:number,base:number}){const pct=base?Math.round(value/base*100):0;return <div className="funnelStep"><span>{label}</span><b>{fmt(value)}</b><small>{pct}% базы</small><i><em style={{width:`${pct}%`}}/></i></div>}
