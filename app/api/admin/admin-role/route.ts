import {NextResponse} from "next/server";
import {session} from "@/lib/auth";
import {getSupabaseAdmin} from "@/lib/supabase-admin";

export async function POST(req:Request){
  const auth=await session();
  if(auth?.role!=="admin")return NextResponse.json({ok:false,error:"Нет доступа"},{status:401});

  const body=await req.json().catch(()=>({}));
  const chatId=Number(body.chatId);
  const enabled=body.enabled===true;
  if(!Number.isSafeInteger(chatId)||chatId<=0)
    return NextResponse.json({ok:false,error:"Некорректный Telegram ID"},{status:400});

  const s=getSupabaseAdmin();
  const now=new Date().toISOString();
  const {error}=enabled
    ? await s.from("admin_users").upsert({chat_id:chatId,is_active:true,updated_at:now},{onConflict:"chat_id"})
    : await s.from("admin_users").upsert({chat_id:chatId,is_active:false,updated_at:now},{onConflict:"chat_id"});

  if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
  return NextResponse.json({ok:true,enabled});
}
