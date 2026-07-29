import TelegramAvatar from "@/components/TelegramAvatar";
import Link from "next/link";
import {Search,SlidersHorizontal,Users} from "lucide-react";
import {adminClientsData,dayKey,fmt,goalKind,mealDay,mealSessions,sumMeals} from "@/lib/data";
import AdminBadge from "@/components/AdminBadge";
export const dynamic="force-dynamic";
type SP=Promise<{q?:string;goal?:string;plan?:string;activity?:string}>;

function relativeActivity(value?:string){
 if(!value)return "Нет активности";const d=new Date(value),diff=Date.now()-d.getTime();
 const dk=d.toLocaleDateString("sv-SE",{timeZone:"Europe/Moscow"}),tk=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Moscow"});
 if(dk===tk)return `Сегодня, ${d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Moscow"})}`;
 const days=Math.floor(diff/86400000);if(days<7)return `${Math.max(1,days)} дн. назад`;
 return d.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",timeZone:"Europe/Moscow"});
}

export default async function Page({searchParams}:{searchParams:SP}){
 const q=await searchParams;const [{profiles,meals,logs,settings,subscriptions},adminIds]=await Promise.all([adminClientsData(),adminChatIds()]);const today=dayKey();
 const settingMap=new Map((settings as any[]).map(x=>[Number(x.chat_id),x]));
 const subMap=new Map<number,any>();for(const x of subscriptions as any[])if(!subMap.has(Number(x.chat_id)))subMap.set(Number(x.chat_id),x);
 const mealsByClient=new Map<number,typeof meals>();const lastMeal=new Map<number,string>();
 for(const m of meals){const id=Number(m.chat_id);if(!mealsByClient.has(id))mealsByClient.set(id,[]);mealsByClient.get(id)!.push(m);const old=lastMeal.get(id);if(!old||m.eaten_at>old)lastMeal.set(id,m.eaten_at)}
 const lastLog=new Map<number,string>();for(const l of logs as any[]){const id=Number(l.chat_id);if(!lastLog.has(id))lastLog.set(id,l.created_at)}
 const rows=profiles.map(p=>{const id=Number(p.telegram_id),pm=mealsByClient.get(id)||[],todayMeals=pm.filter(m=>mealDay(m)===today),weekFrom=new Date(Date.now()-6*86400000);weekFrom.setHours(0,0,0,0);const weekDays=new Set(pm.filter(m=>new Date(m.eaten_at)>=weekFrom).map(mealDay));const last=[lastMeal.get(id),lastLog.get(id)].filter(Boolean).sort().reverse()[0] as string|undefined;return{p,id,st:settingMap.get(id),sub:subMap.get(id),today:sumMeals(todayMeals),todaySessions:mealSessions(todayMeals).length,activeDays:weekDays.size,last}})
 .filter(x=>{const needle=String(q.q||"").trim().toLowerCase();if(needle&&!`${x.p.first_name||""} ${x.p.username||""} ${x.id}`.toLowerCase().includes(needle))return false;if(q.goal&&goalKind(x.st?.goal)!==q.goal)return false;if(q.plan&&String(x.sub?.status==="active"?x.sub?.plan:"none")!==q.plan)return false;if(q.activity==="stale"&&x.last&&Date.now()-new Date(x.last).getTime()<=3*86400000)return false;if(q.activity==="active"&&(!x.last||Date.now()-new Date(x.last).getTime()>3*86400000))return false;return true;});
 return <>
  <div className="pageHead"><div><p>AI‑Nutrition / Клиенты</p><h1>Клиенты</h1><span>Быстрый обзор цели, тарифа и реальной активности — без загрузки всей истории.</span></div></div>
  <section className="clientFilters card"><form className="clientFiltersForm"><label className="clientSearch"><Search size={16}/><input name="q" defaultValue={q.q||""} placeholder="Имя, @username или Telegram ID"/></label><select name="goal" defaultValue={q.goal||""}><option value="">Все цели</option><option>Снижение веса</option><option>Поддержание</option><option>Набор массы</option></select><select name="plan" defaultValue={q.plan||""}><option value="">Все тарифы</option><option value="premium">Premium</option><option value="basic">Basic</option><option value="none">Без подписки</option></select><select name="activity" defaultValue={q.activity||""}><option value="">Любая активность</option><option value="active">Активные ≤3 дней</option><option value="stale">Без активности 3+ дней</option></select><button className="secondaryBtn" type="submit"><SlidersHorizontal size={15}/>Применить</button></form><div className="filterCount"><Users size={15}/>{rows.length} из {profiles.length}</div></section>
  <section className="card tableCard clientsTable optimizedClients"><div className="tableHead clientsGridV3"><span>Клиент</span><span>Цель</span><span>Тариф</span><span>Сегодня</span><span>7 дней</span><span>Активность</span></div>{rows.map(x=><Link href={`/admin/clients/${x.id}`} className="tableRow clientsGridV3 clientRowV2" key={x.p.id}><div className="clientIdentity"><TelegramAvatar profile={x.p} size="small"/><div><b>{x.p.first_name||"Без имени"}{adminIds.has(x.id)&&<AdminBadge/>}</b><small>{x.p.username?`@${x.p.username}`:`ID ${x.id}`}</small></div></div><div><span className="goalPill">{goalKind(x.st?.goal)}</span></div><div><span className={`planPill ${x.sub?.status==="active"?x.sub?.plan:"none"}`}>{x.sub?.status==="active"?String(x.sub.plan).toUpperCase():"—"}</span></div><div className="clientMetric"><b>{fmt(x.today.kcal)} ккал</b><small>{x.todaySessions} приём.</small></div><div className="clientMetric"><b>{x.activeDays}/7</b><small>дней с рационом</small></div><div className={`clientActivity ${x.last&&Date.now()-new Date(x.last).getTime()>3*86400000?"stale":""}`}>{relativeActivity(x.last)}</div></Link>)}</section>
 </>;
}