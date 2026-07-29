import {NextResponse} from "next/server";
import {session} from "@/lib/auth";
import {getSupabaseAdmin} from "@/lib/supabase-admin";

export async function POST(req:Request){
  const a=await session();
  if(a?.role!=="admin") return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({}));
  const chatId=Number(body.chatId);
  const enabled=Boolean(body.enabled);
  if(!Number.isSafeInteger(chatId)||chatId<=0) return NextResponse.json({ok:false,error:"Некорректный Telegram ID"},{status:400});
  const s=getSupabaseAdmin();
  if(enabled){
    const {error}=await s.from("admin_users").upsert({chat_id:chatId,is_active:true,updated_at:new Date().toISOString()},{onConflict:"chat_id"});
    if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
  }else{
    const {error}=await s.from("admin_users").update({is_active:false,updated_at:new Date().toISOString()}).eq("chat_id",chatId);
    if(error) return NextResponse.json({ok:false,error:error.message},{status:500});
  }
  return NextResponse.json({ok:true,enabled});
}
