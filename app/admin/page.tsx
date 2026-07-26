import Link from 'next/link';
import {Activity, MessageSquare, Target, Users} from 'lucide-react';
import {allData,fmt} from '@/lib/data';
export const dynamic='force-dynamic';

export default async function Page(){
 const {profiles,meals,logs,settings,subscriptions}=await allData();
 const since=new Date(Date.now()-7*86400000);
 const active7=new Set<number>();
 meals.filter(m=>new Date(m.eaten_at)>=since).forEach(m=>active7.add(Number(m.chat_id)));
 logs.filter((l:any)=>new Date(l.created_at)>=since).forEach((l:any)=>active7.add(Number(l.chat_id)));
 const latestSubs=new Map<number,any>(); for(const s of subscriptions as any[]){if(!latestSubs.has(Number(s.chat_id)))latestSubs.set(Number(s.chat_id),s)}
 const premium=[...latestSubs.values()].filter(x=>x.plan==='premium'&&x.status==='active').length;
 const goals=(settings as any[]).filter(x=>x.goal).length;
 return <>
  <header className="pageHead adminWelcome"><div><p>AI‑Nutrition / Админка</p><h1>Панель управления</h1><span>Клиенты, активность и коммуникации — без лишних показателей.</span></div></header>
  <div className="adminKpis">
   <Kpi icon={<Users/>} l="Всего клиентов" v={fmt(profiles.length)} sub={`${active7.size} активны за 7 дней`}/>
   <Kpi icon={<Activity/>} l="Активность 7 дней" v={`${profiles.length?Math.round(active7.size/profiles.length*100):0}%`} sub="от всей базы"/>
   <Kpi icon={<Target/>} l="Заполнили цель" v={fmt(goals)} sub={`${profiles.length?Math.round(goals/profiles.length*100):0}% клиентов`}/>
   <Kpi icon={<MessageSquare/>} l="Premium" v={fmt(premium)} sub="активных подписок"/>
  </div>
  <div className="grid2 top">
   <section className="card"><div className="sectionTitleRow"><div><h2>Последние клиенты</h2><span className="muted">Новые профили</span></div><Link className="textLink" href="/admin/clients">Все клиенты →</Link></div>{profiles.slice(0,6).map(p=><Link className="row" href={`/admin/clients/${p.telegram_id}`} key={p.id}><div><b>{p.first_name||'Без имени'}</b><small>{p.username?'@'+p.username:p.telegram_id}</small></div><span>Открыть</span></Link>)}</section>
   <section className="card"><div className="sectionTitleRow"><div><h2>Быстрые действия</h2><span className="muted">Основные разделы</span></div></div><div className="quickAdmin"><Link href="/admin/dialogs"><MessageSquare/><b>Диалоги</b><span>Ответить клиентам</span></Link><Link href="/admin/mailings"><Activity/><b>Рассылка</b><span>Сообщить клиентам</span></Link><Link href="/admin/analytics"><Target/><b>Аналитика</b><span>Посмотреть базу</span></Link><Link href="/admin/clients"><Users/><b>Клиенты</b><span>Профили и питание</span></Link></div></section>
  </div>
 </>
}
function Kpi({icon,l,v,sub}:{icon:React.ReactNode,l:string,v:string,sub:string}){return <div className="adminKpi"><i>{icon}</i><div><span>{l}</span><b>{v}</b><small>{sub}</small></div></div>}
