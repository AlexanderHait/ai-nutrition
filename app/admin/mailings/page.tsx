import {Clock3,Send,Users} from 'lucide-react';
import {getSupabaseAdmin} from '@/lib/supabase-admin';
import MailingComposer from '@/components/MailingComposer';
export const dynamic='force-dynamic';

const segmentName:Record<string,string>={
  all:'Все клиенты',basic:'Basic',premium:'Premium',loss:'Снижение',gain:'Набор',
  maintain:'Поддержание',inactive3:'Неактивны 3+ дня',inactive7:'Неактивны 7+ дней'
};
const errors:Record<string,string>={
  empty:'Заполни название и текст рассылки.',
  attachment:'Разрешены JPG, PNG, WebP, GIF или PDF до 20 МБ.',
  upload:'Не удалось загрузить вложение.',
  send:'Не удалось отправить рассылку. Проверь миграцию 017 и переменные окружения.',
};

export default async function Page({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}){
  const q=await searchParams||{};
  const error=typeof q.error==='string'?q.error:'';
  const ok=typeof q.ok==='string'?q.ok:'';
  const sent=typeof q.sent==='string'?q.sent:'';
  const failed=typeof q.failed==='string'?q.failed:'';

  const s=getSupabaseAdmin();
  const {data,error:dbError}=await s.from('mailings').select('*').order('created_at',{ascending:false}).limit(40);

  return <>
    <div className="pageHead"><div><p>AI‑Nutrition / Админка</p><h1>Рассылки</h1><span>Сегменты, вложения, предпросмотр и история отправок.</span></div></div>

    {dbError&&<div className="notice">Для рассылок должна быть применена актуальная миграция Supabase.</div>}
    {error&&<div className="notice">{errors[error]||'Ошибка рассылки.'}</div>}
    {ok==='1'&&<div className="notice">Рассылка отправлена: {sent||'0'}{failed&&failed!=='0'?` · ошибок: ${failed}`:''}.</div>}
    {ok==='scheduled'&&<div className="notice">Рассылка запланирована.</div>}

    <div className="mailingLayout top">
      <section className="card">
        <div className="sectionTitleRow"><div><h2>Новая рассылка</h2><span className="muted">Текст + фото или PDF. Отправить сейчас или запланировать.</span></div><Send size={20}/></div>
        <MailingComposer/>
      </section>
      <section className="card">
        <div className="sectionTitleRow"><div><h2>История</h2><span className="muted">Последние рассылки</span></div></div>
        <div className="mailHistory">{(data||[]).length?(data||[]).map((x:any)=><div className="mailRow" key={x.id}>
          <i>{x.status==='sent'?<Send/>:<Clock3/>}</i>
          <div><b>{x.title}</b><span>{segmentName[x.segment]||x.segment} · {x.status==='sent'?'Отправлено':'Запланировано'}{x.media_kind?` · ${x.media_kind==='pdf'?'PDF':'фото'}`:''}</span></div>
          <strong><Users size={13}/>{x.status==='sent'?x.sent_count:x.recipient_count}</strong>
        </div>):<p className="muted">Рассылок пока нет.</p>}</div>
      </section>
    </div>
  </>;
}
