import {NextResponse} from 'next/server';
import {session} from '@/lib/auth';
import {getSupabaseAdmin} from '@/lib/supabase-admin';

export async function POST(req:Request){
  const s=await session();
  if(s?.role!=='client'||!s.chatId)return NextResponse.redirect(new URL('/login',req.url));

  const form=await req.formData();
  const content=String(form.get('content')||'').trim().slice(0,3000);
  if(content){
    await getSupabaseAdmin().from('support_messages').insert({
      chat_id:s.chatId,
      sender:'client',
      content
    });
  }
  return NextResponse.redirect(new URL('/client/support',req.url));
}
