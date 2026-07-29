import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {getSupabaseAdmin} from '@/lib/supabase-admin';

const COOKIE='ain_session';
export type Session={role:'admin'|'client';chatId?:number;name?:string;exp:number};

function secret(){
  const v=process.env.SESSION_SECRET;
  if(!v)throw new Error('SESSION_SECRET is required');
  return v;
}

export function signSession(data:Omit<Session,'exp'>){
  const payload=Buffer.from(JSON.stringify({...data,exp:Date.now()+1000*60*60*24*30})).toString('base64url');
  const sig=crypto.createHmac('sha256',secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function readSession(raw?:string):Session|null{
  try{
    if(!raw)return null;
    const [payload,sig]=raw.split('.');
    const good=crypto.createHmac('sha256',secret()).update(payload).digest('base64url');
    if(!sig||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(good)))return null;
    const s=JSON.parse(Buffer.from(payload,'base64url').toString()) as Session;
    return s.exp>Date.now()?s:null;
  }catch{return null}
}

/**
 * Effective session.
 * - Password/master admins remain admins.
 * - A normal Telegram client promoted in admin_users becomes an admin immediately,
 *   including already-open sessions and all API routes that call session().
 * - Removing the role immediately returns that Telegram session to client permissions.
 */
export async function session():Promise<Session|null>{
  const raw=readSession((await cookies()).get(COOKIE)?.value);
  if(!raw)return null;
  if(raw.role==='admin')return raw;
  if(!raw.chatId)return raw;

  try{
    const s=getSupabaseAdmin();
    const {data,error}=await s.from('admin_users')
      .select('is_active')
      .eq('chat_id',raw.chatId)
      .maybeSingle();

    if(!error&&data?.is_active===true)return {...raw,role:'admin'};
  }catch{
    // Authorization must fail closed: DB problems never grant admin rights.
  }
  return raw;
}

export async function requireAdmin(){
  const s=await session();
  if(s?.role!=='admin')redirect('/login');
  return s;
}

export async function requireClient(){
  const s=await session();
  if(s?.role==='admin'&&s.chatId)redirect('/admin');
  if(s?.role!=='client'||!s.chatId)redirect('/login');
  return s;
}

export const sessionCookie=COOKIE;

export function verifyTelegram(data:Record<string,string>){
  const hash=data.hash;
  if(!hash||!process.env.TELEGRAM_BOT_TOKEN)return false;
  const pairs=Object.entries(data)
    .filter(([k])=>k!=='hash')
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([k,v])=>`${k}=${v}`)
    .join('\n');
  const key=crypto.createHash('sha256').update(process.env.TELEGRAM_BOT_TOKEN).digest();
  const calc=crypto.createHmac('sha256',key).update(pairs).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(calc));
}
