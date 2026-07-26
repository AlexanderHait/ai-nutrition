import {NextResponse} from 'next/server';
import {session} from '@/lib/auth';
import {getSupabaseAdmin} from '@/lib/supabase-admin';

export async function POST(req:Request){
  const s=await session();
  if(s?.role!=='admin')return NextResponse.redirect(new URL('/login',req.url));

  const form=await req.formData();
  const chatId=Number(form.get('chat_id'));
  const content=String(form.get('content')||'').trim().slice(0,3000);

  if(chatId&&content){
    await getSupabaseAdmin().from('support_messages').insert({
      chat_id:chatId,
      sender:'admin',
      content
    });
  }
  return NextResponse.redirect(new URL(`/admin/dialogs?chat=${chatId}`,req.url));
}
