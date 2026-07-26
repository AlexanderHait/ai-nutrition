import {NextResponse} from "next/server";
import {session} from "@/lib/auth";
import {getSupabaseAdmin} from "@/lib/supabase-admin";

export const dynamic="force-dynamic";

function safeReturn(value:string, fallback:string){
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

async function telegram(method:string, params:Record<string,string|number>){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  if(!token)throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const url=new URL(`https://api.telegram.org/bot${token}/${method}`);
  for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
  const r=await fetch(url,{cache:"no-store"});
  const j=await r.json().catch(()=>null) as any;
  if(!r.ok||!j?.ok)throw new Error(j?.description||`Telegram ${method} failed`);
  return j.result;
}

export async function POST(req:Request){
  const auth=await session();
  if(!auth)return NextResponse.redirect(new URL("/login",req.url));

  const form=await req.formData();
  const requested=Number(form.get("chat_id"));
  const fallback=auth.role==="admin"?"/admin/clients":"/client/profile";
  const returnTo=safeReturn(String(form.get("return_to")||fallback),fallback);

  const chatId=auth.role==="admin" ? requested : Number(auth.chatId);
  if(!Number.isSafeInteger(chatId)||chatId<=0){
    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?")?"&":"?"}sync=bad_id`,req.url));
  }

  try{
    // getChat is the authoritative "current" source for username/name.
    const chat=await telegram("getChat",{chat_id:chatId});

    // Profile photo is fetched independently so a missing photo never blocks username sync.
    let fileId:string|null=null;
    try{
      const photos=await telegram("getUserProfilePhotos",{user_id:chatId,offset:0,limit:1});
      const sizes=Array.isArray(photos?.photos?.[0])?photos.photos[0]:[];
      fileId=sizes.length?String(sizes[sizes.length-1]?.file_id||""):null;
    }catch{
      fileId=null;
    }

    const update:any={
      first_name:String(chat?.first_name||"").trim()||null,
      username:String(chat?.username||"").trim()||null,
      avatar_file_id:fileId||null,
      // Force TelegramAvatar to use the freshly resolved Bot API photo instead of a stale OAuth picture URL.
      avatar_url:null,
      avatar_updated_at:new Date().toISOString()
    };

    const supabase=getSupabaseAdmin();
    const {error}=await supabase.from("profiles").update(update).eq("telegram_id",chatId);
    if(error)throw error;

    const join=returnTo.includes("?")?"&":"?";
    return NextResponse.redirect(new URL(`${returnTo}${join}sync=ok`,req.url));
  }catch(error){
    console.error("Telegram profile refresh failed",error);
    const join=returnTo.includes("?")?"&":"?";
    return NextResponse.redirect(new URL(`${returnTo}${join}sync=error`,req.url));
  }
}
