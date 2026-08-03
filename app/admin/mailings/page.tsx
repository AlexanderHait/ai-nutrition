import {ChevronDown,Clock3,Send,Users} from 'lucide-react';
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
        <div className="sectionTitleRow"><div><h2>История</h2><span className="muted">Нажми на рассылку — покажу текст, который ушёл в бота</span></div></div>
        <div className="mailHistory">{(data||[]).length?(data||[]).map((x:any)=>{
          const when=x.sent_at||x.scheduled_at||x.created_at;
          const failed=x.status==='sent'?Math.max(0,Number(x.recipient_count||0)-Number(x.sent_count||0)):0;
          return <details className="mailRow" key={x.id}>
            <summary>
              <i>{x.status==='sent'?<Send/>:<Clock3/>}</i>
              <div><b>{x.title}</b><span>{segmentName[x.segment]||x.segment} · {x.status==='sent'?'Отправлено':'Запланировано'} · {when?new Date(when).toLocaleString('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}):'—'}</span></div>
              <strong><Users size={13}/>{x.status==='sent'?x.sent_count:x.recipient_count}</strong>
              <ChevronDown size={16} className="mailRowChevron"/>
            </summary>
            <div className="mailRowBody">
              <div className="mailRowStats">
                <span><small>Получателей</small><b>{x.recipient_count??'—'}</b></span>
                <span><small>Доставлено</small><b>{x.status==='sent'?(x.sent_count??0):'—'}</b></span>
                <span><small>Не дошло</small><b className={failed?'statusBad':undefined}>{x.status==='sent'?failed:'—'}</b></span>
                <span><small>Создана</small><b>{x.created_at?new Date(x.created_at).toLocaleString('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}):'—'}</b></span>
              </div>
              <p className="mailRowLabel">Что ушло в бота</p>
              <pre className="mailRowText">{x.content||'Текст не сохранён.'}</pre>
            </div>
          </details>;
        }):<p className="muted">Рассылок пока нет.</p>}</div>
      </section>
    </div>
  </>;
}
