import Link from 'next/link';
import {Activity,AlertTriangle,Crown,MessageSquare,Scale,Target,Users} from 'lucide-react';
import {allData,dayKey,fmt,goalKind,sumMeals} from '@/lib/data';
export const dynamic='force-dynamic';

type Attention={id:number;name:string;username:string;score:number;reasons:string[]};

export default async function Page(){
  const {profiles,meals,logs,settings,subscriptions,support,weights}=await allData();
  const now=Date.now(),today=dayKey(),week=now-7*86400000;
  const active7=new Set<number>();
  const activity=new Map<number,number>();

  for(const m of meals){
    const id=Number(m.chat_id),ts=new Date(m.eaten_at).getTime();
    if(ts>=week)active7.add(id);
    activity.set(id,Math.max(activity.get(id)||0,ts));
  }
  for(const l of logs as any[]){
    const id=Number(l.chat_id),ts=new Date(l.created_at).getTime();
    if(ts>=week)active7.add(id);
    activity.set(id,Math.max(activity.get(id)||0,ts));
  }

  const settingsMap=new Map((settings as any[]).map(x=>[Number(x.chat_id),x]));
  const latestSubs=new Map<number,any>();
  for(const s of subscriptions as any[])if(!latestSubs.has(Number(s.chat_id)))latestSubs.set(Number(s.chat_id),s);

  const lastWeight=new Map<number,any>();
  for(const w of weights as any[])if(!lastWeight.has(Number(w.chat_id)))lastWeight.set(Number(w.chat_id),w);

  const unreadByClient=new Map<number,number>();
  for(const m of support as any[]){
    if(m.sender==='client'&&!m.read_by_admin_at){
      const id=Number(m.chat_id);
      unreadByClient.set(id,(unreadByClient.get(id)||0)+1);
    }
  }

  const attention:Attention[]=profiles.map(p=>{
    const id=Number(p.telegram_id),reasons:string[]=[];
    const last=activity.get(id)||0;
    const st:any=settingsMap.get(id);
    const dayMeals=meals.filter(m=>Number(m.chat_id)===id&&m.eaten_day===today);
    const dayTotal=sumMeals(dayMeals);
    const target=Number(st?.kcal_target||0);
    const weight:any=lastWeight.get(id);
    const unread=unreadByClient.get(id)||0;

    if(unread)reasons.push(`${unread} непрочит. сообщ.`);
    if(!last)reasons.push('ещё не было активности');
    else if(now-last>3*86400000)reasons.push(`${Math.floor((now-last)/86400000)} дн. без активности`);
    if(target>0&&dayTotal.kcal>0&&dayTotal.kcal<target*.7)reasons.push('сегодня <70% калорий');
    if(!st?.goal)reasons.push('не заполнена цель');
    if(!weight)reasons.push('нет измерений веса');
    else if(now-new Date(weight.measured_at).getTime()>10*86400000)reasons.push('вес не обновлялся 10+ дней');

    return{
      id,name:p.first_name||p.username||`Telegram ${id}`,username:p.username?`@${p.username}`:'',
      score:unread*5+reasons.length,reasons
    };
  }).filter(x=>x.reasons.length).sort((a,b)=>b.score-a.score).slice(0,10);

  const premium=[...latestSubs.values()].filter(x=>x.plan==='premium'&&x.status==='active').length;
  const unread=[...unreadByClient.values()].reduce((a,b)=>a+b,0);

  return <>
    <header className="pageHead adminWelcome">
      <div><p>AI‑Nutrition / Админка</p><h1>Панель управления</h1><span>С утра сразу видно, кому нужно внимание и что происходит с базой.</span></div>
      <Link className="primary compactBtn" href="/admin/mailings">Новая рассылка</Link>
    </header>

    <div className="adminKpis">
      <Kpi icon={<Users/>} l="Всего клиентов" v={fmt(profiles.length)} sub={`${active7.size} активны за 7 дней`}/>
      <Kpi icon={<MessageSquare/>} l="Непрочитанные" v={fmt(unread)} sub={unread?'нужен ответ':'всё разобрано'}/>
      <Kpi icon={<AlertTriangle/>} l="Требуют внимания" v={fmt(attention.length)} sub="по текущим правилам"/>
      <Kpi icon={<Crown/>} l="Premium" v={fmt(premium)} sub="активных подписок"/>
    </div>

    <div className="dashboardMain top">
      <section className="card attentionCenter">
        <div className="sectionTitleRow">
          <div><h2>Центр внимания</h2><span className="muted">Приоритетные клиенты на сегодня</span></div>
          <Link className="textLink" href="/admin/analytics">Вся аналитика →</Link>
        </div>
        {attention.length?<div className="attentionCards">
          {attention.map(x=><Link href={`/admin/clients/${x.id}`} className="attentionCard" key={x.id}>
            <div className="attentionAvatar">{x.name[0]?.toUpperCase()}</div>
            <div><b>{x.name}</b><small>{x.username}</small><p>{x.reasons.slice(0,3).join(' · ')}</p></div>
            <span>Открыть</span>
          </Link>)}
        </div>:<div className="positiveEmpty"><Target/><b>На сегодня всё спокойно</b><span>Новых сигналов внимания нет.</span></div>}
      </section>

      <aside className="dashboardSide">
        <section className="card">
          <div className="sectionTitleRow"><div><h2>Быстрые действия</h2><span className="muted">Без лишних переходов</span></div></div>
          <div className="quickAdmin vertical">
            <Link href="/admin/dialogs"><MessageSquare/><b>Ответить клиентам</b><span>{unread?`${unread} непрочитанных`:'Новых нет'}</span></Link>
            <Link href="/admin/mailings"><Activity/><b>Создать рассылку</b><span>Сегменты и шаблоны</span></Link>
            <Link href="/admin/clients"><Users/><b>Найти клиента</b><span>Профиль и питание</span></Link>
            <Link href="/admin/analytics"><Scale/><b>Открыть аналитику</b><span>Цели, тарифы, активность</span></Link>
          </div>
        </section>

        <section className="card recentCompact">
          <div className="sectionTitleRow"><div><h2>Новые клиенты</h2><span className="muted">Последние регистрации</span></div></div>
          {profiles.slice(0,5).map(p=><Link className="recentClient" href={`/admin/clients/${p.telegram_id}`} key={p.id}>
            <i>{String(p.first_name||p.username||'?')[0].toUpperCase()}</i>
            <span><b>{p.first_name||'Без имени'}</b><small>{p.username?'@'+p.username:p.telegram_id}</small></span>
          </Link>)}
        </section>
      </aside>
    </div>
  </>;
}
function Kpi({icon,l,v,sub}:{icon:React.ReactNode,l:string,v:string,sub:string}){return <div className="adminKpi"><i>{icon}</i><div><span>{l}</span><b>{v}</b><small>{sub}</small></div></div>}
