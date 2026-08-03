import Link from "next/link";
import {adminChatIds,supportMessages} from "@/lib/data";
import {getSupabaseAdmin} from "@/lib/supabase-admin";
import SupportThread from "@/components/SupportThread";
import TelegramAvatar from "@/components/TelegramAvatar";
import {SupportComposer} from "@/components/support/SupportComposer";
import {MessageSquare,Search} from "lucide-react";
import AdminBadge from "@/components/AdminBadge";

export const dynamic="force-dynamic";
type SP=Promise<{chat?:string;filter?:string;q?:string}>;

function timeLabel(v?:string){
  if(!v)return "";
  const d=new Date(v),now=new Date();
  const same=d.toLocaleDateString("sv-SE",{timeZone:"Europe/Moscow"})===now.toLocaleDateString("sv-SE",{timeZone:"Europe/Moscow"});
  return d.toLocaleString("ru-RU",same?{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Moscow"}:{day:"2-digit",month:"2-digit",timeZone:"Europe/Moscow"});
}
function preview(v?:string){
  const s=String(v||"").replace(/\s+/g," ").trim();
  return s.length>74?s.slice(0,71)+"…":s||"Диалог ещё не начат";
}

export default async function Page({searchParams}:{searchParams:SP}){
  const p=await searchParams;
  const db=getSupabaseAdmin();
  const [{data:profiles,error:profileError},{data:messages,error:messageError},adminIds]=await Promise.all([
    db.from("profiles").select("telegram_id,first_name,username,created_at,avatar_url,avatar_file_id,avatar_updated_at").is("deleted_at",null).order("created_at",{ascending:false}),
    db.from("support_messages").select("id,chat_id,sender,content,created_at,read_by_admin_at,attachment_path,attachment_name,attachment_mime").order("created_at",{ascending:false}).limit(5000),
    adminChatIds(),
  ]);
  if(profileError)throw profileError;
  if(messageError)throw messageError;

  const byChat=new Map<number,any[]>();
  for(const message of messages||[]){
    const id=Number(message.chat_id);
    if(!byChat.has(id))byChat.set(id,[]);
    byChat.get(id)!.push(message);
  }

  const all=(profiles||[]).map((profile:any)=>{
    const chatId=Number(profile.telegram_id);
    const rows=byChat.get(chatId)||[];
    return{
      chatId,
      profile,
      latest:rows[0]||null,
      unread:rows.filter((row:any)=>row.sender==="client"&&!row.read_by_admin_at).length,
    };
  }).sort((a,b)=>{
    if(b.unread!==a.unread)return b.unread-a.unread;
    const at=a.latest?new Date(a.latest.created_at).getTime():0;
    const bt=b.latest?new Date(b.latest.created_at).getTime():0;
    if(bt!==at)return bt-at;
    return new Date(b.profile.created_at||0).getTime()-new Date(a.profile.created_at||0).getTime();
  });

  const filter=p.filter||"all";
  const q=String(p.q||"").trim().toLowerCase();
  const threads=all.filter(thread=>{
    if(filter==="unread"&&!thread.unread)return false;
    const hay=`${thread.profile?.first_name||""} ${thread.profile?.username||""} ${thread.chatId}`.toLowerCase();
    return !q||hay.includes(q);
  });

  const requested=Number(p.chat);
  const selected=threads.find(thread=>thread.chatId===requested)||threads[0]||null;
  const conversation=selected?await supportMessages(selected.chatId):[];
  if(selected?.unread){
    await db.from("support_messages").update({read_by_admin_at:new Date().toISOString()}).eq("chat_id",selected.chatId).eq("sender","client").is("read_by_admin_at",null);
  }
  const unreadTotal=all.reduce((sum,thread)=>sum+thread.unread,0);

  return <>
    <div className="pageHead"><div><p>AI‑Nutrition / Коммуникация</p><h1>Диалоги</h1><span>Все клиенты доступны сразу — даже до первого обращения.</span></div></div>
    <div className="dialogFilters">
      <Link className={filter==="all"?"active":""} href="/admin/dialogs">Все <b>{all.length}</b></Link>
      <Link className={filter==="unread"?"active":""} href="/admin/dialogs?filter=unread">Непрочитанные <b>{unreadTotal}</b></Link>
      <form><input type="hidden" name="filter" value={filter}/><label><Search size={15}/><input name="q" defaultValue={p.q||""} placeholder="Имя, @username, ID"/></label></form>
    </div>
    {!threads.length?
      <section className="card emptyState"><MessageSquare/><b>Клиенты не найдены</b><span>Измени поиск или фильтр.</span></section>:
      <section className="dialogsLayout optimizedDialogs">
        <aside className="dialogsList card">
          <div className="dialogsListTitle">Клиенты</div>
          {threads.map(thread=>{
            const name=thread.profile?.first_name||thread.profile?.username||`Telegram ${thread.chatId}`;
            const active=selected?.chatId===thread.chatId;
            const suffix=`${filter!=="all"?`&filter=${filter}`:""}${p.q?`&q=${encodeURIComponent(p.q)}`:""}`;
            const attachment=thread.latest?.attachment_path;
            const prefix=attachment?(thread.latest?.attachment_mime==="application/pdf"?"📄 ":"📷 "):"";
            return <Link key={thread.chatId} href={`/admin/dialogs?chat=${thread.chatId}${suffix}`} className={`dialogPerson${active?" active":""}${thread.unread?" unread":""}`}>
              <TelegramAvatar profile={thread.profile} size="small"/>
              <div className="dialogPersonText"><div><b>{name}{adminIds.has(thread.chatId)&&<AdminBadge/>}</b><time>{thread.unread?<em className="unreadDot">{thread.unread}</em>:timeLabel(thread.latest?.created_at)}</time></div><span>{prefix}{preview(thread.latest?.content)}</span></div>
            </Link>;
          })}
        </aside>
        {selected?<div className="conversation card supportConversation">
          <div className="conversationHead"><div className="conversationIdentity"><TelegramAvatar profile={selected.profile} size="small"/><span><b>{selected.profile?.first_name||selected.profile?.username||`Telegram ${selected.chatId}`}{adminIds.has(selected.chatId)&&<AdminBadge/>}</b><small>{selected.profile?.username?`@${selected.profile.username}`:`ID ${selected.chatId}`}</small></span></div><Link className="textLink" href={`/admin/clients/${selected.chatId}`}>Карточка →</Link></div>
          <SupportThread messages={conversation as any[]} role="admin"/>
          <SupportComposer chatId={selected.chatId} firstContact={!selected.latest}/>
        </div>:null}
      </section>}
  </>;
}
