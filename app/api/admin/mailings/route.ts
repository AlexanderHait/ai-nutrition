import {NextResponse} from "next/server";
import {session} from "@/lib/auth";
import {getSupabaseAdmin} from "@/lib/supabase-admin";
import {goalKind} from "@/lib/data";

async function recipients(segment:string){
  const s=getSupabaseAdmin();
  if(segment==="all"){const {data}=await s.from("profiles").select("telegram_id");return (data||[]).map((x:any)=>Number(x.telegram_id))}
  if(segment==="basic"||segment==="premium"){const {data}=await s.from("subscriptions").select("chat_id,plan,status").eq("status","active").eq("plan",segment);return [...new Set((data||[]).map((x:any)=>Number(x.chat_id)))]}
  if(["loss","gain","maintain"].includes(segment)){const {data}=await s.from("client_settings").select("chat_id,goal");const target=segment==="loss"?"Снижение":segment==="gain"?"Набор":"Поддержание";return [...new Set((data||[]).filter((x:any)=>goalKind(x.goal)===target).map((x:any)=>Number(x.chat_id)))]}
  if(segment==="inactive3"||segment==="inactive7"){const days=segment==="inactive3"?3:7;const [{data:profiles},{data:meals},{data:logs}]=await Promise.all([s.from("profiles").select("telegram_id"),s.from("meals").select("chat_id,eaten_at").eq("deleted",false),s.from("chat_logs").select("chat_id,created_at").limit(10000)]);const last=new Map<number,number>();for(const x of meals||[]){const id=Number(x.chat_id),ts=new Date(x.eaten_at).getTime();last.set(id,Math.max(last.get(id)||0,ts))}for(const x of logs||[]){const id=Number(x.chat_id),ts=new Date(x.created_at).getTime();last.set(id,Math.max(last.get(id)||0,ts))}const cutoff=Date.now()-days*86400000;return (profiles||[]).map((x:any)=>Number(x.telegram_id)).filter((id:number)=>(last.get(id)||0)<cutoff)}
  return [];
}

async function signedMedia(path:string|null){
  if(!path)return null;const s=getSupabaseAdmin();
  const {data}=await s.storage.from("mailing-media").createSignedUrl(path,60*60);
  return data?.signedUrl||null;
}
async function sendTelegram(ids:number[],text:string,mediaPath:string|null,mediaKind:string|null){
  const token=process.env.TELEGRAM_BOT_TOKEN;if(!token)throw new Error("TELEGRAM_BOT_TOKEN не задан");
  const media=await signedMedia(mediaPath);let sent=0;
  for(const chat_id of ids){
    let method="sendMessage",body:any={chat_id,text};
    if(media&&mediaKind==="image"){method="sendPhoto";body={chat_id,photo:media,caption:text}}
    if(media&&mediaKind==="pdf"){method="sendDocument";body={chat_id,document:media,caption:text}}
    const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    if(r.ok)sent++;
  }return sent;
}

export async function POST(req:Request){
  const a=await session();if(a?.role!=="admin")return NextResponse.redirect(new URL("/login",req.url));
  const f=await req.formData();const title=String(f.get("title")||"").trim(),content=String(f.get("content")||"").trim(),segment=String(f.get("segment")||"all"),scheduled=String(f.get("scheduled_at")||"").trim(),action=String(f.get("action")||"schedule");
  if(!title||!content)return NextResponse.redirect(new URL("/admin/mailings?error=empty",req.url));
  const s=getSupabaseAdmin();let mediaPath:string|null=null;
  const image=f.get("image");
  let mediaKind:string|null=null;
  if(image instanceof File&&image.size>0){
    const allowed=["image/jpeg","image/png","image/webp","image/gif","application/pdf"];
    if(!allowed.includes(image.type)||image.size>20*1024*1024)return NextResponse.redirect(new URL("/admin/mailings?error=attachment",req.url));
    mediaKind=image.type==="application/pdf"?"pdf":"image";
    const ext=image.name.split(".").pop()?.toLowerCase()||(mediaKind==="pdf"?"pdf":"jpg");mediaPath=`${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const {error}=await s.storage.from("mailing-media").upload(mediaPath,Buffer.from(await image.arrayBuffer()),{contentType:image.type,upsert:false});
    if(error)return NextResponse.redirect(new URL("/admin/mailings?error=upload",req.url));
  }
  const ids=await recipients(segment);
  if(action==="send"){const sent=await sendTelegram(ids,content,mediaPath,mediaKind);await s.from("mailings").insert({title,content,segment,status:"sent",recipient_count:ids.length,sent_count:sent,sent_at:new Date().toISOString(),media_path:mediaPath,media_kind:mediaKind})}
  else await s.from("mailings").insert({title,content,segment,status:"scheduled",recipient_count:ids.length,scheduled_at:scheduled?new Date(scheduled).toISOString():new Date().toISOString(),media_path:mediaPath,media_kind:mediaKind});
  return NextResponse.redirect(new URL("/admin/mailings?ok=1",req.url));
}
