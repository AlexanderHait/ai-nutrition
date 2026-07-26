import Link from 'next/link';
import {supportMessages,supportThreads} from '@/lib/data';
import {getSupabaseAdmin} from '@/lib/supabase-admin';
import SupportThread from '@/components/SupportThread';
export const dynamic='force-dynamic';

type SearchParams=Promise<{chat?:string;filter?:string;q?:string}>;

function timeLabel(v?:string){
  if(!v)return '';
  const d=new Date(v),now=new Date(),same=d.toDateString()===now.toDateString();
  return d.toLocaleString('ru-RU',same?{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'}:{day:'2-digit',month:'2-digit',timeZone:'Europe/Moscow'});
}
function preview(v?:string){const s=String(v||'').replace(/\s+/g,' ').trim();return s.length>66?s.slice(0,63)+'…':s||'Нет текста'}

export default async function Page({searchParams}:{searchParams:SearchParams}){
  const params=await searchParams;
  const all=await supportThreads();
  const filter=params.filter||'all';
  const q=String(params.q||'').trim().toLowerCase();
  const threads=all.filter(x=>{
    if(filter==='unread'&&!x.unread)return false;
    const name=String(x.profile?.first_name||x.profile?.username||x.chatId).toLowerCase();
    const username=String(x.profile?.username||'').toLowerCase();
    return !q||name.includes(q)||username.includes(q);
  });
  const requested=Number(params.chat);
  const selected=threads.find(x=>x.chatId===requested)||threads[0];
  const messages=selected?await supportMessages(selected.chatId):[];

  if(selected?.unread){
    await getSupabaseAdmin().from('support_messages').update({read_by_admin_at:new Date().toISOString()})
      .eq('chat_id',selected.chatId).eq('sender','client').is('read_by_admin_at',null);
  }
  const unreadTotal=all.reduce((a,x)=>a+x.unread,0);

  return <>
    <div className="pageHead"><div><p>AI‑Nutrition / Админка</p><h1>Диалоги</h1><span>Обращения клиентов к тебе — без переписки с AI.</span></div></div>
    <div className="dialogFilters">
      <Link className={filter==='all'?'active':''} href="/admin/dialogs">Все <b>{all.length}</b></Link>
      <Link className={filter==='unread'?'active':''} href="/admin/dialogs?filter=unread">Непрочитанные <b>{unreadTotal}</b></Link>
      <form><input type="hidden" name="filter" value={filter}/><input name="q" defaultValue={params.q||''} placeholder="Поиск клиента…"/></form>
    </div>

    {!threads.length?<section className="card"><span className="muted">Подходящих диалогов нет.</span></section>:
      <section className="dialogsLayout">
        <aside className="dialogsList card">
          <div className="dialogsListTitle">Обращения</div>
          {threads.map(d=>{
            const name=d.profile?.first_name||d.profile?.username||`Telegram ${d.chatId}`;
            const active=selected?.chatId===d.chatId;
            const suffix=`${filter!=='all'?`&filter=${filter}`:''}${params.q?`&q=${encodeURIComponent(params.q)}`:''}`;
            return <Link key={d.chatId} href={`/admin/dialogs?chat=${d.chatId}${suffix}`} className={`dialogPerson${active?' active':''}${d.unread?' unread':''}`}>
              <div className="dialogAvatar">{String(name).slice(0,1).toUpperCase()}</div>
              <div className="dialogPersonText"><div><b>{name}</b><time>{d.unread?<em className="unreadDot">{d.unread}</em>:timeLabel(d.latest?.created_at)}</time></div><span>{preview(d.latest?.content)}</span></div>
            </Link>
          })}
        </aside>

        <div className="conversation card supportConversation">
          <div className="conversationHead">
            <div><b>{selected?.profile?.first_name||selected?.profile?.username||`Telegram ${selected?.chatId}`}</b><span>{selected?.profile?.username?'@'+selected.profile.username:`ID ${selected?.chatId}`}</span></div>
            <Link className="textLink" href={`/admin/clients/${selected?.chatId}`}>Карточка клиента →</Link>
          </div>
          <SupportThread messages={messages as any[]} role="admin"/>
          <form action="/api/support/admin" method="post" className="supportComposer adminSupportComposer">
            <input type="hidden" name="chat_id" value={selected!.chatId}/>
            <textarea name="content" rows={2} maxLength={3000} placeholder="Ответить клиенту…" required/>
            <button className="primary" type="submit">Отправить</button>
          </form>
        </div>
      </section>}
  </>;
}
