'use client';
import {useEffect,useRef} from 'react';
import {useRouter} from 'next/navigation';
import type {SupportMessage} from '@/lib/support-types';
import {SupportMessageBody} from '@/components/support/SupportMessageBody';

function deliveryLabel(message:SupportMessage,role:'client'|'admin'){
 if(role!=='admin'||message.sender!=='admin')return null;
 if(message.delivery_error)return <span style={{color:'#ef7777'}}>Ошибка отправки: {message.delivery_error}</span>;
 if(message.delivered_to_client_at)return <span style={{opacity:.62}}>Доставлено в Telegram</span>;
 return <span style={{opacity:.55}}>Отправляется в Telegram…</span>;
}

export default function SupportThread({messages,role}:{messages:SupportMessage[];role:'client'|'admin'}){
 const box=useRef<HTMLDivElement>(null),router=useRouter();
 useEffect(()=>{requestAnimationFrame(()=>{if(box.current)box.current.scrollTop=box.current.scrollHeight})},[messages.length]);
 useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==='visible')router.refresh()};
    const t=window.setInterval(refresh,12000);
    const onVisibility=()=>{if(document.visibilityState==='visible')router.refresh()};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{clearInterval(t);document.removeEventListener('visibilitychange',onVisibility)};
  },[router]);
 return <div className="supportMessages" ref={box}>
 {messages.length===0&&<div className="supportEmpty"><b>Диалог пока пуст</b><span>{role==='client'?'Напиши вопрос или оставь обратную связь — здесь ответит человек.':'Напишите клиенту первое сообщение — оно придёт прямо в Telegram.'}</span></div>}
 {messages.map(message=>{const own=message.sender===role,status=deliveryLabel(message,role);return <article className={`supportBubble ${own?'own':'other'}`} key={message.id}>
 <div className="supportBubbleMeta"><b>{message.sender==='client'?'Клиент':'Администратор'}</b><time>{new Date(message.created_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'})}</time></div>
 <SupportMessageBody message={message}/>{status?<small style={{display:'block',marginTop:6,fontSize:10}}>{status}</small>:null}</article>})}</div>
}
