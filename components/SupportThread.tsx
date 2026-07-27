'use client';
import {useEffect,useRef} from 'react';
import {useRouter} from 'next/navigation';
import type {SupportMessage} from '@/lib/support-types';
import {SupportMessageBody} from '@/components/support/SupportMessageBody';
export default function SupportThread({messages,role}:{messages:SupportMessage[];role:'client'|'admin'}){
 const box=useRef<HTMLDivElement>(null),router=useRouter();
 useEffect(()=>{requestAnimationFrame(()=>{if(box.current)box.current.scrollTop=box.current.scrollHeight})},[messages.length]);
 useEffect(()=>{
    const refresh=()=>{ if(document.visibilityState==='visible') router.refresh(); };
    const t=window.setInterval(refresh,12000);
    const onVisibility=()=>{ if(document.visibilityState==='visible') router.refresh(); };
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{ clearInterval(t); document.removeEventListener('visibilitychange',onVisibility); };
  },[router]);
 return <div className="supportMessages" ref={box}>
 {messages.length===0&&<div className="supportEmpty"><b>Диалог пока пуст</b><span>{role==='client'?'Напиши вопрос или оставь обратную связь — здесь ответит человек.':'Клиент ещё ничего не писал через сайт.'}</span></div>}
 {messages.map(m=>{const own=m.sender===role;return <article className={`supportBubble ${own?'own':'other'}`} key={m.id}>
 <div className="supportBubbleMeta"><b>{m.sender==='client'?'Клиент':'Администратор'}</b><time>{new Date(m.created_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'})}</time></div>
 <SupportMessageBody message={m}/></article>})}</div>
}
