import {NextResponse} from "next/server";import {getSupabaseAdmin} from "@/lib/supabase-admin";
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return new NextResponse("Unauthorized",{status:401});
 const s=getSupabaseAdmin(),{data}=await s.from("mailings").select("*").eq("status","scheduled").lte("scheduled_at",new Date().toISOString()).limit(10);
 for(const m of data||[]){
  let ids:number[]=[];if(m.segment==="all"){const {data:p}=await s.from("profiles").select("telegram_id");ids=(p||[]).map((x:any)=>Number(x.telegram_id))}else{const {data:p}=await s.from("subscriptions").select("chat_id").eq("status","active").eq("plan",m.segment);ids=Array.from(new Set<number>((p||[]).map((x:any)=>Number(x.chat_id))))}
  let photo:string|null=null;if(m.media_path){const {data:u}=await s.storage.from("mailing-media").createSignedUrl(m.media_path,3600);photo=u?.signedUrl||null}
  let sent=0;for(const chat_id of ids){let method="sendMessage",body:any={chat_id,text:m.content};if(photo&&m.media_kind==="image"){method="sendPhoto";body={chat_id,photo,caption:m.content}}if(photo&&m.media_kind==="pdf"){method="sendDocument";body={chat_id,document:photo,caption:m.content}}const r=await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});if(r.ok)sent++}
  await s.from("mailings").update({status:"sent",recipient_count:ids.length,sent_count:sent,sent_at:new Date().toISOString()}).eq("id",m.id)
 }return NextResponse.json({processed:(data||[]).length})
}
