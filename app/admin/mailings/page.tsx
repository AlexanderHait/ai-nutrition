import {Clock3,Send,Users} from 'lucide-react';
import {getSupabaseAdmin} from '@/lib/supabase-admin';
import MailingComposer from '@/components/MailingComposer';
export const dynamic='force-dynamic';

const segmentName:Record<string,string>={
  all:'Все клиенты',basic:'Basic',premium:'Premium',loss:'Снижение',gain:'Набор',maintain:'Поддержание',inactive3:'Неактивны 3+ дня',inactive7:'Неактивны 7+ дней'
};

export default async function Page(){
  const s=getSupabaseAdmin();
  const {data,error}=await s.from('mailings').select('*').order('created_at',{ascending:false}).limit(40);
  return <>
    <div className="pageHead"><div><p>AI‑Nutrition / Админка</p><h1>Рассылки</h1><span>Сегменты, шаблоны, предпросмотр и история отправок.</span></div></div>
    {error&&<div className="notice">Для рассылок выполни миграцию <b>004_mailings.sql</b> в Supabase.</div>}
    <div className="mailingLayout top">
      <section className="card"><div className="sectionTitleRow"><div><h2>Новая рассылка</h2><span className="muted">Отправить сейчас или запланировать</span></div><Send size={20}/></div><MailingComposer/></section>
      <section className="card"><div className="sectionTitleRow"><div><h2>История</h2><span className="muted">Последние рассылки</span></div></div>
        <div className="mailHistory">{(data||[]).length?(data||[]).map((x:any)=><div className="mailRow" key={x.id}>
          <i>{x.status==='sent'?<Send/>:<Clock3/>}</i><div><b>{x.title}</b><span>{segmentName[x.segment]||x.segment} · {x.status==='sent'?'Отправлено':'Запланировано'}</span></div><strong><Users size={13}/>{x.status==='sent'?x.sent_count:x.recipient_count}</strong>
        </div>):<p className="muted">Рассылок пока нет.</p>}</div>
      </section>
    </div>
  </>;
}
