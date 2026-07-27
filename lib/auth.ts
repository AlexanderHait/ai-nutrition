import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
const COOKIE='ain_session';
type Session={role:'admin'|'client';chatId?:number;name?:string;exp:number};
function secret(){const v=process.env.SESSION_SECRET;if(!v)throw new Error('SESSION_SECRET is required');return v}
export function signSession(data:Omit<Session,'exp'>){const payload=Buffer.from(JSON.stringify({...data,exp:Date.now()+1000*60*60*24*30})).toString('base64url');const sig=crypto.createHmac('sha256',secret()).update(payload).digest('base64url');return `${payload}.${sig}`}
export function readSession(raw?:string):Session|null{try{if(!raw)return null;const [payload,sig]=raw.split('.');const good=crypto.createHmac('sha256',secret()).update(payload).digest('base64url');if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(good)))return null;const s=JSON.parse(Buffer.from(payload,'base64url').toString()) as Session;return s.exp>Date.now()?s:null}catch{return null}}
export async function session(){return readSession((await cookies()).get(COOKIE)?.value)}
export async function requireAdmin(){const s=await session();if(s?.role!=='admin')redirect('/login');return s}
export async function requireClient(){const s=await session();if(s?.role!=='client'||!s.chatId)redirect('/login');return s}
export const sessionCookie=COOKIE;
export function verifyTelegram(data:Record<string,string>){const hash=data.hash; if(!hash||!process.env.TELEGRAM_BOT_TOKEN)return false;const pairs=Object.entries(data).filter(([k])=>k!=='hash').sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');const key=crypto.createHash('sha256').update(process.env.TELEGRAM_BOT_TOKEN).digest();const calc=crypto.createHmac('sha256',key).update(pairs).digest('hex');return crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(calc))}
