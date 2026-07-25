import Link from 'next/link';
import {allData,dayKey,fmt,sumMeals} from '@/lib/data';

export const dynamic='force-dynamic';

function relativeActivity(value?:string){
  if(!value)return '—';
  const d=new Date(value);
  const diff=Date.now()-d.getTime();
  const time=d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'});
  const dateKey=d.toLocaleDateString('sv-SE',{timeZone:'Europe/Moscow'});
  const now=new Date();
  const todayKey=now.toLocaleDateString('sv-SE',{timeZone:'Europe/Moscow'});
  const yesterday=new Date(now.getTime()-86400000);
  const yesterdayKey=yesterday.toLocaleDateString('sv-SE',{timeZone:'Europe/Moscow'});
  if(dateKey===todayKey)return `Сегодня, ${time}`;
  if(dateKey===yesterdayKey)return `Вчера, ${time}`;
  const days=Math.max(2,Math.floor(diff/86400000));
  if(days<=6)return `${days} дня назад`;
  return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Moscow'});
}

export default async function Page(){
  const {profiles,meals,logs}=await allData();
  const today=dayKey();
  return <>
    <div className="pageHead"><div><p>AI‑Nutrition / Админка</p><h1>Клиенты</h1><span>Только то, что нужно для ежедневного контроля</span></div></div>
    <section className="card tableCard">
      <div className="tableHead clientsGrid"><span>Клиент</span><span>Сегодня</span><span>Всего</span><span>Последняя активность</span></div>
      {profiles.map(p=>{
        const pm=meals.filter(m=>m.chat_id===Number(p.telegram_id));
        const t=pm.filter(m=>m.eaten_day===today);
        const s=sumMeals(t);
        const last=[pm[0]?.eaten_at,...logs.filter((l:any)=>Number(l.chat_id)===Number(p.telegram_id)).slice(0,1).map((x:any)=>x.created_at)].filter(Boolean).sort().reverse()[0] as string|undefined;
        return <Link href={`/admin/clients/${p.telegram_id}`} className="tableRow clientsGrid" key={p.id}>
          <div><b>{p.first_name||'Без имени'}</b><small>{p.username?'@'+p.username:String(p.telegram_id)}</small></div>
          <div><b>{fmt(s.kcal)} ккал</b><small>{t.length} {t.length===1?'приём':'приёма'}</small></div>
          <div>{pm.length} приёмов</div>
          <div className={last&&Date.now()-new Date(last).getTime()>3*86400000?'stale':''}>{relativeActivity(last)}</div>
        </Link>;
      })}
    </section>
  </>;
}
