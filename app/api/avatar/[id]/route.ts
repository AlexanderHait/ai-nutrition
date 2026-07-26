import {NextResponse} from "next/server";
import {getSupabaseAdmin} from "@/lib/supabase-admin";
export const dynamic="force-dynamic";

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const chatId=Number(id);
  if(!Number.isSafeInteger(chatId)||chatId<=0)return new NextResponse(null,{status:404});
  const token=process.env.TELEGRAM_BOT_TOKEN;
  if(!token)return new NextResponse(null,{status:404});
  const s=getSupabaseAdmin();
  const {data:p}=await s.from('profiles').select('avatar_url,avatar_file_id').eq('telegram_id',chatId).maybeSingle();
  if(p?.avatar_url)return NextResponse.redirect(p.avatar_url);
  let fileId=String(p?.avatar_file_id||'');
  if(!fileId){
    const r=await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${chatId}&limit=1`,{cache:'no-store'});
    const j=await r.json().catch(()=>null) as any;
    const photos=j?.ok?j.result?.photos?.[0]:null;
    fileId=String(photos?.[photos.length-1]?.file_id||'');
    if(!fileId)return new NextResponse(null,{status:404,headers:{'Cache-Control':'public, max-age=3600'}});
    await s.from('profiles').update({avatar_file_id:fileId,avatar_updated_at:new Date().toISOString()}).eq('telegram_id',chatId);
  }
  const fr=await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,{cache:'no-store'});
  const fj=await fr.json().catch(()=>null) as any;
  const path=fj?.ok?fj.result?.file_path:null;
  if(!path)return new NextResponse(null,{status:404});
  const img=await fetch(`https://api.telegram.org/file/bot${token}/${path}`);
  if(!img.ok)return new NextResponse(null,{status:404});
  return new NextResponse(img.body,{status:200,headers:{
    'Content-Type':img.headers.get('content-type')||'image/jpeg',
    'Cache-Control':'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
  }});
}
