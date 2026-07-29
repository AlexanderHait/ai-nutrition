import {NextResponse} from "next/server";
import {session} from "@/lib/auth";
import {getSupabaseAdmin} from "@/lib/supabase-admin";
import {goalKind} from "@/lib/data";

const BUCKET="mailing-media";
const MAX_FILE=20*1024*1024;
const ALLOWED=["image/jpeg","image/png","image/webp","image/gif","application/pdf"];

function go(req:Request,path:string){
  return NextResponse.redirect(new URL(path,req.url),303);
}

async function ensureMediaBucket(){
  const s=getSupabaseAdmin();
  const {data,error}=await s.storage.getBucket(BUCKET);
  if(data&&!error)return;
  const created=await s.storage.createBucket(BUCKET,{public:false,fileSizeLimit:MAX_FILE,allowedMimeTypes:ALLOWED});
  if(created.error&&!String(created.error.message||"").toLowerCase().includes("already"))throw new Error(`Storage bucket: ${created.error.message}`);
}

async function recipients(segment:string){
  const s=getSupabaseAdmin();
  if(segment==="all"){
    const {data}=await s.from("profiles").select("telegram_id");
    return (data||[]).map((x:any)=>Number(x.telegram_id)).filter(Boolean);
  }
  if(segment==="basic"||segment==="premium"){
    const {data}=await s.from("subscriptions").select("chat_id,plan,status").eq("status","active").eq("plan",segment);
    return [...new Set((data||[]).map((x:any)=>Number(x.chat_id)).filter(Boolean))];
  }
  if(["loss","gain","maintain"].includes(segment)){
    const {data}=await s.from("client_settings").select("chat_id,goal");
    const target=segment==="loss"?"Снижение":segment==="gain"?"Набор":"Поддержание";
    return [...new Set((data||[]).filter((x:any)=>goalKind(x.goal)===target).map((x:any)=>Number(x.chat_id)).filter(Boolean))];
  }
  if(segment==="inactive3"||segment==="inactive7"){
    const days=segment==="inactive3"?3:7;
    const [{data:profiles},{data:meals},{data:logs}]=await Promise.all([
      s.from("profiles").select("telegram_id"),
      s.from("meals").select("chat_id,eaten_at").eq("deleted",false),
      s.from("chat_logs").select("chat_id,created_at").limit(10000),
    ]);
    const last=new Map<number,number>();
    for(const x of meals||[]){const id=Number(x.chat_id),ts=new Date(x.eaten_at).getTime();last.set(id,Math.max(last.get(id)||0,ts));}
    for(const x of logs||[]){const id=Number(x.chat_id),ts=new Date(x.created_at).getTime();last.set(id,Math.max(last.get(id)||0,ts));}
    const cutoff=Date.now()-days*86400000;
    return (profiles||[]).map((x:any)=>Number(x.telegram_id)).filter((id:number)=>id&&(last.get(id)||0)<cutoff);
  }
  return [];
}

async function signedMedia(path:string|null){
  if(!path)return null;
  const s=getSupabaseAdmin();
  const {data,error}=await s.storage.from(BUCKET).createSignedUrl(path,3600);
  if(error)throw new Error(`Signed URL: ${error.message}`);
  return data?.signedUrl||null;
}

async function sendTelegram(ids:number[],text:string,mediaPath:string|null,mediaKind:string|null){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  if(!token)throw new Error("TELEGRAM_BOT_TOKEN не задан");
  const media=await signedMedia(mediaPath);
  let sent=0,failed=0;
  for(const chat_id of ids){
    let method="sendMessage",body:any={chat_id,text};
    if(media&&mediaKind==="image"){method="sendPhoto";body={chat_id,photo:media,caption:text};}
    if(media&&mediaKind==="pdf"){method="sendDocument";body={chat_id,document:media,caption:text};}
    const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    if(r.ok)sent++;else failed++;
  }
  return {sent,failed};
}

// Production compatibility: media columns were introduced after the original mailings table.
// We always persist the mailing itself even if that migration has not reached a deployment yet.
async function createHistoryRow(base:any,mediaPath:string|null,mediaKind:string|null){
  const s=getSupabaseAdmin();
  if(mediaPath){
    const rich=await s.from("mailings").insert({...base,media_path:mediaPath,media_kind:mediaKind}).select("id").single();
    if(!rich.error&&rich.data)return Number(rich.data.id);
    const msg=String(rich.error?.message||"").toLowerCase();
    const missingMediaColumns=msg.includes("media_path")||msg.includes("media_kind")||msg.includes("schema cache")||rich.error?.code==="PGRST204";
    if(!missingMediaColumns)throw new Error(`Mailing history: ${rich.error?.message}`);
  }
  const plain=await s.from("mailings").insert(base).select("id").single();
  if(plain.error||!plain.data)throw new Error(`Mailing history: ${plain.error?.message||"row not created"}`);
  return Number(plain.data.id);
}

export async function POST(req:Request){
  const a=await session();
  if(a?.role!=="admin")return go(req,"/login");

  let historyId:number|null=null;
  try{
    const f=await req.formData();
    const title=String(f.get("title")||"").trim();
    const content=String(f.get("content")||"").trim();
    const segment=String(f.get("segment")||"all");
    const scheduled=String(f.get("scheduled_at")||"").trim();
    const action=String(f.get("action")||"schedule");
    if(!title||!content)return go(req,"/admin/mailings?error=empty");

    const s=getSupabaseAdmin();
    let mediaPath:string|null=null,mediaKind:string|null=null;
    const attachment=f.get("image");
    if(attachment instanceof File&&attachment.size>0){
      if(!ALLOWED.includes(attachment.type)||attachment.size>MAX_FILE)return go(req,"/admin/mailings?error=attachment");
      await ensureMediaBucket();
      mediaKind=attachment.type==="application/pdf"?"pdf":"image";
      const safeExt=(attachment.name.split(".").pop()||"").toLowerCase().replace(/[^a-z0-9]/g,"");
      const ext=safeExt||(mediaKind==="pdf"?"pdf":"jpg");
      mediaPath=`${new Date().toISOString().slice(0,10)}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const {error}=await s.storage.from(BUCKET).upload(mediaPath,Buffer.from(await attachment.arrayBuffer()),{contentType:attachment.type,upsert:false,cacheControl:"3600"});
      if(error)throw new Error(`Upload: ${error.message}`);
    }

    const ids=await recipients(segment);

    if(action==="send"){
      // Persist first. This prevents "delivered in Telegram but missing from history".
      historyId=await createHistoryRow({title,content,segment,status:"draft",recipient_count:ids.length,sent_count:0},mediaPath,mediaKind);
      const result=await sendTelegram(ids,content,mediaPath,mediaKind);
      const {error}=await s.from("mailings").update({status:"sent",sent_count:result.sent,sent_at:new Date().toISOString()}).eq("id",historyId);
      if(error)throw new Error(`Mailing result save: ${error.message}`);
      return go(req,`/admin/mailings?ok=1&sent=${result.sent}&failed=${result.failed}`);
    }

    historyId=await createHistoryRow({
      title,content,segment,status:"scheduled",recipient_count:ids.length,sent_count:0,
      scheduled_at:scheduled?new Date(scheduled).toISOString():new Date().toISOString(),
    },mediaPath,mediaKind);
    return go(req,"/admin/mailings?ok=scheduled");
  }catch(e){
    console.error("Mailing POST failed",e);
    if(historyId){
      try{await getSupabaseAdmin().from("mailings").update({status:"cancelled"}).eq("id",historyId);}catch{}
    }
    return go(req,"/admin/mailings?error=send");
  }
}
