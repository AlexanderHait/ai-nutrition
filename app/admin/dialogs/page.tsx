import Link from 'next/link';
import {allData} from '@/lib/data';

export const dynamic='force-dynamic';

type SearchParams = Promise<{chat?:string}>;

function timeLabel(value?:string){
  if(!value)return '—';
  const d=new Date(value);
  const now=new Date();
  const dateKey=d.toLocaleDateString('sv-SE',{timeZone:'Europe/Moscow'});
  const todayKey=now.toLocaleDateString('sv-SE',{timeZone:'Europe/Moscow'});
  const yesterdayKey=new Date(now.getTime()-86400000).toLocaleDateString('sv-SE',{timeZone:'Europe/Moscow'});
  const time=d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'});
  if(dateKey===todayKey)return time;
  if(dateKey===yesterdayKey)return 'Вчера';
  return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',timeZone:'Europe/Moscow'});
}

function preview(text?:string){
  const clean=String(text||'').replace(/\s+/g,' ').trim();
  return clean.length>70?clean.slice(0,67)+'…':clean||'Нет текста';
}

export default async function Page({searchParams}:{searchParams:SearchParams}){
  const {profiles,logs}=await allData();
  const params=await searchParams;
  const byChat=new Map<number,any[]>();
  for(const log of logs as any[]){
    const id=Number(log.chat_id);
    if(!id)continue;
    if(!byChat.has(id))byChat.set(id,[]);
    byChat.get(id)!.push(log);
  }

  const dialogs=[...byChat.entries()].map(([chatId,items])=>{
    const profile=profiles.find(p=>Number(p.telegram_id)===chatId);
    const latest=items[0];
    return {chatId,items,profile,latest};
  }).sort((a,b)=>new Date(b.latest?.created_at||0).getTime()-new Date(a.latest?.created_at||0).getTime());

  const requested=Number(params.chat);
  const selected=dialogs.find(x=>x.chatId===requested)||dialogs[0];
  const messages=selected?[...selected.items].reverse():[];

  return <>
    <div className="pageHead"><div><p>AI‑Nutrition / Админка</p><h1>Диалоги</h1><span>Переписка клиентов с ботом — без лишней CRM</span></div></div>

    {dialogs.length===0?<section className="card"><span className="muted">Сообщений пока нет.</span></section>:
    <section className="dialogsLayout">
      <aside className="dialogsList card">
        <div className="dialogsListTitle">Клиенты</div>
        {dialogs.map(d=>{
          const name=d.profile?.first_name||d.profile?.username||`Telegram ${d.chatId}`;
          const active=selected?.chatId===d.chatId;
          return <Link key={d.chatId} href={`/admin/dialogs?chat=${d.chatId}`} className={`dialogPerson${active?' active':''}`}>
            <div className="dialogAvatar">{String(name).slice(0,1).toUpperCase()}</div>
            <div className="dialogPersonText"><div><b>{name}</b><time>{timeLabel(d.latest?.created_at)}</time></div><span>{preview(d.latest?.content)}</span></div>
          </Link>;
        })}
      </aside>

      <div className="conversation card">
        <div className="conversationHead">
          <div>
            <b>{selected?.profile?.first_name||selected?.profile?.username||`Telegram ${selected?.chatId}`}</b>
            <span>{selected?.profile?.username?'@'+selected.profile.username:`ID ${selected?.chatId}`}</span>
          </div>
          <Link className="textLink" href={`/admin/clients/${selected?.chatId}`}>Карточка клиента →</Link>
        </div>
        <div className="messages">
          {messages.slice(-100).map((m:any)=>{
            const isUser=m.role==='user';
            return <article key={m.id} className={`messageBubble ${isUser?'user':'assistant'}`}>
              <div><b>{isUser?'Клиент':'AI'}</b><time>{new Date(m.created_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'})}</time></div>
              <p>{m.content}</p>
            </article>;
          })}
        </div>
      </div>
    </section>}
  </>;
}
