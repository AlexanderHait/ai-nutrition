import TelegramAvatar from "@/components/TelegramAvatar";
import Link from 'next/link';
import {allData,dayKey,fmt,mealDay,mealSessions,sumMeals} from '@/lib/data';

export const dynamic='force-dynamic';

function relativeActivity(value?:string){
  if(!value)return '—';
  const d=new Date(value);
  const diff=Date.now()-d.getTime();
  const time=d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'});
  const dk=d.toLocaleDateString('sv-SE',{timeZone:'Europe/Moscow'});
  const now=new Date();
  const tk=now.toLocaleDateString('sv-SE',{timeZone:'Europe/Moscow'});
  if(dk===tk)return `Сегодня, ${time}`;
  if(diff<7*86400000)return `${Math.max(1,Math.floor(diff/86400000))} дн. назад`;
  return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Moscow'});
}

function goalName(v:any){
  const s=String(v||'').toLowerCase();
  if(s.includes('loss')||s.includes('сниж')||s.includes('похуд'))return 'Снижение';
  if(s.includes('gain')||s.includes('набор'))return 'Набор';
  if(s.includes('maint')||s.includes('поддерж'))return 'Поддержание';
  return v||'Не указана';
}

export default async function Page(){
  const {profiles,meals,logs,settings,subscriptions}=await allData();
  const today=dayKey();

  const settingMap=new Map((settings as any[]).map(x=>[Number(x.chat_id),x]));
  const subMap=new Map<number,any>();
  for(const x of subscriptions as any[]){
    if(!subMap.has(Number(x.chat_id)))subMap.set(Number(x.chat_id),x);
  }

  return <>
    <div className="pageHead">
      <div>
        <p>AI‑Nutrition / Админка</p>
        <h1>Клиенты</h1>
        <span>Профили, цели, тарифы и реальная активность</span>
      </div>
    </div>

    <section className="card tableCard clientsTable">
      <div className="tableHead clientsGridV2">
        <span>Клиент</span>
        <span>Цель</span>
        <span>Тариф</span>
        <span>Сегодня</span>
        <span>Всего</span>
        <span>Активность</span>
      </div>

      {profiles.map(p=>{
        const id=Number(p.telegram_id);
        const pm=meals.filter(m=>m.chat_id===id);
        const t=pm.filter(m=>mealDay(m)===today);

        const todaySessions=mealSessions(t);
        const allSessions=mealSessions(pm);
        const s=sumMeals(t);

        const logLast=logs
          .filter((l:any)=>Number(l.chat_id)===id)
          .map((x:any)=>x.created_at)
          .filter(Boolean);

        const last=[...pm.map(m=>m.eaten_at),...logLast]
          .filter(Boolean)
          .sort()
          .reverse()[0] as string|undefined;

        const st:any=settingMap.get(id);
        const sub=subMap.get(id);

        return <Link href={`/admin/clients/${id}`} className="tableRow clientsGridV2 clientRowV2" key={p.id}>
          <div className="clientIdentity">
            <TelegramAvatar profile={p} size="small"/>
            <div>
              <b>{p.first_name||'Без имени'}</b>
              <small>{p.username?'@'+p.username:String(id)}</small>
            </div>
          </div>

          <div className="clientCell">
            <span className="goalPill">{goalName(st?.goal)}</span>
          </div>

          <div className="clientCell">
            <span className={`planPill ${sub?.plan||'none'}`}>
              {sub?.status==='active'?String(sub.plan).toUpperCase():'—'}
            </span>
          </div>

          <div className="clientMetric">
            <b>{fmt(s.kcal)} ккал</b>
            <small>{todaySessions.length} {todaySessions.length===1?'приём':'приёма'}</small>
          </div>

          <div className="clientMetric">
            <b>{allSessions.length}</b>
            <small>{allSessions.length===1?'приём':'приёмов'}</small>
          </div>

          <div className={`clientActivity ${last&&Date.now()-new Date(last).getTime()>3*86400000?'stale':''}`}>
            {relativeActivity(last)}
          </div>
        </Link>
      })}
    </section>
  </>;
}
