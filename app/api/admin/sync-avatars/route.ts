import {NextResponse} from "next/server";
import {session} from "@/lib/auth";
import {getSupabaseAdmin} from "@/lib/supabase-admin";
export async function POST(req:Request){
  const auth=await session(); if(auth?.role!=='admin')return new NextResponse('Unauthorized',{status:401});
  const token=process.env.TELEGRAM_BOT_TOKEN; if(!token)return new NextResponse('TELEGRAM_BOT_TOKEN missing',{status:500});
  const s=getSupabaseAdmin(); const {data:profiles}=await s.from('profiles').select('telegram_id').limit(500);
  let updated=0;
  for(const p of profiles||[]){
    const id=Number((p as any).telegram_id); if(!id)continue;
    try{
      const r=await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${id}&limit=1`,{cache:'no-store'});
      const j=await r.json() as any; const a=j?.ok?j.result?.photos?.[0]:null; const fileId=String(a?.[a.length-1]?.file_id||'');
      if(fileId){await s.from('profiles').update({avatar_file_id:fileId,avatar_updated_at:new Date().toISOString()}).eq('telegram_id',id);updated++}
    }catch{}
  }
  return NextResponse.redirect(new URL('/admin?avatars=1',req.url),303);
}
