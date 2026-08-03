import TelegramAvatar from "@/components/TelegramAvatar";
import Link from "next/link";
import {Search,SlidersHorizontal,Users} from "lucide-react";
import {adminChatIds,adminClientsData,dayKey,fmt,goalKind,mealDay,mealSessions,sumMeals} from "@/lib/data";
import {coachScores} from "@/lib/coach-score";
import AdminBadge from "@/components/AdminBadge";
import ClientDeleteButton from "@/components/ClientDeleteButton";
export const dynamic="force-dynamic";
type SP=Promise<{q?:string;goal?:string;plan?:string;activity?:string;client?:string}>;

function relativeActivity(value?:string){
 if(!value)return "Нет активности";const d=new Date(value),diff=Date.now()-d.getTime();
 const dk=d.toLocaleDateString("sv-SE",{timeZone:"Europe/Moscow"}),tk=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Moscow"});
 if(dk===tk)return `Сегодня, ${d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Moscow"})}`;
 const days=Math.floor(diff/86400000);if(days<7)return `${Math.max(1,days)} дн. назад`;
 return d.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",timeZone:"Europe/Moscow"});
}
function activePlan(sub:any){return sub?.status==="active"&&(sub?.plan==="basic"||sub?.plan==="premium")?String(sub.plan):"none"}
function planLabel(plan:string){return plan==="premium"?"PREMIUM":plan==="basic"?"BASIC":"БЕЗ ПОДПИСКИ"}
function macroTarget(st:any){
 const kcal=Number(st?.kcal_target||0),p=Number(st?.protein_target||st?.protein_target_g||0),f=Number(st?.fat_target||st?.fat_target_g||0),c=Number(st?.carb_target||st?.carb_target_g||0);
 if(!kcal&&!p&&!f&&!c)return "КБЖУ не заполнены";
 return `${kcal?`${fmt(kcal)} ккал`:"—"} · Б ${p?fmt(p):"—"} · Ж ${f?fmt(f):"—"} · У ${c?fmt(c):"—"}`;
}
function scoreHint(status?:string){
 if(status==="setup_required")return "нужны цели КБЖУ";
 if(status==="no_data")return "нет данных";
 if(status==="preliminary")return "предварительно";
 if(status==="growing")return "точность растёт";
 return "надёжный расчёт";
}

export default async function Page({searchParams}:{searchParams:SP}){
 const q=await searchParams;const [{profiles,meals,logs,settings,subscriptions},adminIds]=await Promise.all([adminClientsData(),adminChatIds()]);const today=dayKey();
 const scoreRows=await coachScores(profiles.map(p=>Number(p.telegram_id)));const scoreMap=new Map(scoreRows.map(x=>[Number(x.chat_id),x]));
 const settingMap=new Map((settings as any[]).map(x=>[Number(x.chat_id),x]));
 const subMap=new Map<number,any>();for(const x of subscriptions as any[])if(!subMap.has(Number(x.chat_id)))subMap.set(Number(x.chat_id),x);
 const mealsByClient=new Map<number,typeof meals>();const lastMeal=new Map<number,string>();
 for(const m of meals){const id=Number(m.chat_id);if(!mealsByClient.has(id))mealsByClient.set(id,[]);mealsByClient.get(id)!.push(m);const old=lastMeal.get(id);if(!old||m.eaten_at>old)lastMeal.set(id,m.eaten_at)}
 const lastLog=new Map<number,string>();for(const l of logs as any[]){const id=Number(l.chat_id);if(!lastLog.has(id))lastLog.set(id,l.created_at)}
 const rows=profiles.map(p=>{const id=Number(p.telegram_id),pm=mealsByClient.get(id)||[],todayMeals=pm.filter(m=>mealDay(m)===today),weekFrom=new Date(Date.now()-6*86400000);weekFrom.setHours(0,0,0,0);const weekDays=new Set(pm.filter(m=>new Date(m.eaten_at)>=weekFrom).map(mealDay));const last=[lastMeal.get(id),lastLog.get(id)].filter(Boolean).sort().reverse()[0] as string|undefined;const st=settingMap.get(id),sub=subMap.get(id),plan=activePlan(sub),isAdmin=adminIds.has(id),coach=scoreMap.get(id);return{p,id,st,sub,plan,isAdmin,coach,today:sumMeals(todayMeals),todaySessions:mealSessions(todayMeals).length,activeDays:weekDays.size,last}})
 .filter(x=>{const needle=String(q.q||"").trim().toLowerCase();if(needle&&!`${x.p.first_name||""} ${x.p.username||""} ${x.id}`.toLowerCase().includes(needle))return false;if(q.goal&&goalKind(x.st?.goal)!==q.goal)return false;if(q.plan&&x.plan!==q.plan)return false;if(q.activity==="stale"&&x.last&&Date.now()-new Date(x.last).getTime()<=3*86400000)return false;if(q.activity==="active"&&(!x.last||Date.now()-new Date(x.last).getTime()>3*86400000))return false;return true;});
 const activeCount=rows.filter(x=>x.last&&Date.now()-new Date(x.last).getTime()<=3*86400000).length,premiumCount=rows.filter(x=>x.plan==="premium").length,adminCount=rows.filter(x=>x.isAdmin).length;
 return <>
  <div className="pageHead"><div><p>AI‑Nutrition / Клиенты</p><h1>Клиенты</h1><span>Тариф, роль, Coach Score, КБЖУ и активность клиента в одном списке.</span></div></div>
  {q.client==="deleted"?<div className="successNotice">Клиент убран из списка. Данные сохранены.</div>:null}
  {q.client==="restored"?<div className="successNotice">Клиент возвращён в список.</div>:null}
  {q.client&&!["deleted","restored"].includes(q.client)?<div className="subscriptionControlError">Не удалось изменить клиента.</div>:null}
  <section className="clientFilters card"><form className="clientFiltersForm"><label className="clientSearch"><Search size={16}/><input name="q" defaultValue={q.q||""} placeholder="Имя, @username или Telegram ID"/></label><select name="goal" defaultValue={q.goal||""}><option value="">Все цели</option><option>Снижение веса</option><option>Поддержание</option><option>Набор массы</option></select><select name="plan" defaultValue={q.plan||""}><option value="">Все тарифы</option><option value="premium">Premium</option><option value="basic">Basic</option><option value="none">Без подписки</option></select><select name="activity" defaultValue={q.activity||""}><option value="">Любая активность</option><option value="active">Активные ≤3 дней</option><option value="stale">Без активности 3+ дней</option></select><button className="secondaryBtn" type="submit"><SlidersHorizontal size={15}/>Применить</button></form><div className="filterCount"><Users size={15}/>{rows.length} из {profiles.length} · активных ≤3 дней: {activeCount} · Premium: {premiumCount} · админов: {adminCount}</div></section>
  <section className="card tableCard clientsTable optimizedClients"><div className="tableHead clientsGridV4"><span>Клиент</span><span>Статус</span><span>Цель / КБЖУ</span><span>Сегодня</span><span>Coach Score</span><span>Активность</span><span/></div><div className="tableScroll">{rows.map(x=><div className="tableRow clientsGridV4 clientRowV2" key={x.p.id}>{x.id?<Link href={`/admin/clients/${x.id}`} className="clientIdentity"><TelegramAvatar profile={x.p} size="small"/><div><b>{x.p.first_name||"Без имени"}</b><small>{x.p.username?`@${x.p.username}`:`ID ${x.id}`}</small></div></Link>:<div className="clientIdentity noTelegram"><TelegramAvatar profile={x.p} size="small"/><div><b>{x.p.first_name||"Без имени"}</b><small>Без Telegram — карточка недоступна</small></div></div>}<div className="clientStatusStack"><span className={`planPill ${x.plan}`}>{planLabel(x.plan)}</span>{x.isAdmin&&<AdminBadge/>}</div><div className="clientGoalMacro"><b>{goalKind(x.st?.goal)}</b><small>{macroTarget(x.st)}</small></div><div className="clientMetric"><b>{fmt(x.today.kcal)} ккал</b><small>{x.todaySessions} приём.</small></div><div className="clientMetric"><b>{x.coach?.score==null?"—":`${x.coach.score}/100`}</b><small>{scoreHint(x.coach?.data_status)} · {x.coach?.active_days??x.activeDays}/{x.coach?.period_days??7} дней</small></div><div className={`clientActivity ${x.last&&Date.now()-new Date(x.last).getTime()>3*86400000?"stale":""}`}>{relativeActivity(x.last)}</div><ClientDeleteButton profileId={Number(x.p.id)} name={x.p.first_name||`ID ${x.id}`}/></div>)}</div></section>
 </>;
}
