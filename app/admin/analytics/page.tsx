import Link from 'next/link';
import {Activity,Crown,Target,UserCheck,Users} from 'lucide-react';
import {allData,dayKey,fmt,goalKind,mealSessions} from '@/lib/data';
export const dynamic='force-dynamic';

export default async function Page(){
  const {profiles,meals,logs,settings,subscriptions}=await allData();
  const now=Date.now(),week=now-7*86400000,month=now-30*86400000;
  const activity=new Map<number,number>();

  for(const m of meals)activity.set(Number(m.chat_id),Math.max(activity.get(Number(m.chat_id))||0,new Date(m.eaten_at).getTime()));
  for(const l of logs as any[])activity.set(Number(l.chat_id),Math.max(activity.get(Number(l.chat_id))||0,new Date(l.created_at).getTime()));

  const active7=[...activity.values()].filter(x=>x>=week).length;
  const active30=[...activity.values()].filter(x=>x>=month).length;
  const retention=profiles.length?Math.round(active30/profiles.length*100):0;

  const goals=['Снижение','Набор','Поддержание','Не указана'];
  const gc:Record<string,number>=Object.fromEntries(goals.map(g=>[g,0]));
  for(const x of settings as any[])gc[goalKind(x.goal)]++;
  gc['Не указана']+=Math.max(0,profiles.length-(settings as any[]).length);

  const latest=new Map<number,any>();
  for(const x of subscriptions as any[])if(!latest.has(Number(x.chat_id)))latest.set(Number(x.chat_id),x);
  let basic=0,premium=0,none=0;
  for(const p of profiles){
    const x=latest.get(Number(p.telegram_id));
    if(x?.status==='active'&&x.plan==='basic')basic++;
    else if(x?.status==='active'&&x.plan==='premium')premium++;
    else none++;
  }

  const sessions7=mealSessions(meals.filter(m=>new Date(m.eaten_at).getTime()>=week)).length;
  const days=Array.from({length:14},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(13-i));
    const key=dayKey(d);
    return{
      key,
      label:d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'}),
      clients:profiles.filter(p=>dayKey(new Date(p.created_at))===key).length,
      sessions:mealSessions(meals.filter(m=>m.eaten_day===key)).length
    };
  });
  const maxSessions=Math.max(1,...days.map(x=>x.sessions));
  const maxClients=Math.max(1,...days.map(x=>x.clients));

  const attention=profiles.map(p=>({p,last:activity.get(Number(p.telegram_id))||0}))
    .filter(x=>!x.last||x.last<now-3*86400000)
    .sort((a,b)=>a.last-b.last).slice(0,8);

  return <>
    <div className="pageHead"><div><p>AI‑Nutrition / Админка</p><h1>Аналитика</h1><span>Только показатели, которые помогают управлять продуктом и клиентами.</span></div></div>

    <div className="adminKpis">
      <K icon={<Users/>} l="Всего клиентов" v={fmt(profiles.length)} sub={`${active30} активны за 30 дней`}/>
      <K icon={<UserCheck/>} l="Активны 7 дней" v={fmt(active7)} sub={`${profiles.length?Math.round(active7/profiles.length*100):0}% базы`}/>
      <K icon={<Activity/>} l="Приёмов за 7 дней" v={fmt(sessions7)} sub="реальных сгруппированных приёмов"/>
      <K icon={<Crown/>} l="Удержание 30 дней" v={`${retention}%`} sub={`${premium} Premium · ${basic} Basic`}/>
    </div>

    <div className="analyticsDashboard top">
      <section className="card wideChartCard">
        <div className="sectionTitleRow"><div><h2>Активность за 14 дней</h2><span className="muted">Количество реальных приёмов пищи</span></div></div>
        <div className="businessBars">
          {days.map(d=><div className="businessBar" key={d.key}>
            <span>{d.sessions||''}</span><div><i style={{height:`${Math.max(4,d.sessions/maxSessions*100)}%`}}/></div><small>{d.label}</small>
          </div>)}
        </div>
      </section>

      <section className="card">
        <h2>Тарифы</h2>
        <div className="planOverview">
          <div><Crown/><b>{premium}</b><span>Premium</span></div>
          <div><Target/><b>{basic}</b><span>Basic</span></div>
          <div><Users/><b>{none}</b><span>Без активного</span></div>
        </div>
        <div className="stackedBar" aria-label="Распределение тарифов">
          <i style={{width:`${profiles.length?premium/profiles.length*100:0}%`}}/>
          <b style={{width:`${profiles.length?basic/profiles.length*100:0}%`}}/>
        </div>
      </section>
    </div>

    <div className="analyticsDashboard top">
      <section className="card">
        <h2>Цели клиентов</h2>
        <div className="segmentList">{goals.map(g=><Segment key={g} label={g} value={gc[g]} total={profiles.length}/>)}</div>
      </section>
      <section className="card">
        <div className="sectionTitleRow"><div><h2>Новые регистрации</h2><span className="muted">Последние 14 дней</span></div></div>
        <div className="miniBusinessBars">
          {days.map(d=><div key={d.key}><i style={{height:`${Math.max(3,d.clients/maxClients*100)}%`}}/><small>{d.label.slice(0,2)}</small></div>)}
        </div>
      </section>
    </div>

    <section className="card top">
      <div className="sectionTitleRow"><div><h2>Неактивные клиенты</h2><span className="muted">Нет активности более 3 дней</span></div></div>
      {attention.length?<div className="attentionList">{attention.map(({p,last})=><Link className="attentionRow" href={`/admin/clients/${p.telegram_id}`} key={p.telegram_id}>
        <div><b>{p.first_name||p.username||p.telegram_id}</b><small>{p.username?`@${p.username}`:`ID ${p.telegram_id}`}</small></div>
        <span>{!last?'Активности ещё не было':`${Math.floor((now-last)/86400000)} дн. без активности`}</span>
      </Link>)}</div>:<p className="muted">Все клиенты активны.</p>}
    </section>
  </>;
}
function K({icon,l,v,sub}:{icon:React.ReactNode,l:string,v:string,sub:string}){return <div className="adminKpi"><i>{icon}</i><div><span>{l}</span><b>{v}</b><small>{sub}</small></div></div>}
function Segment({label,value,total}:{label:string,value:number,total:number}){const pct=total?Math.round(value/total*100):0;return <div className="segmentRow"><div><b>{label}</b><span>{value} · {pct}%</span></div><div><i style={{width:`${pct}%`}}/></div></div>}
