'use client';

import {useEffect,useRef} from 'react';
import {useRouter} from 'next/navigation';

type Message={id:number|string;sender:'client'|'admin';content:string;created_at:string};

export default function SupportThread({
  messages,
  role
}:{messages:Message[];role:'client'|'admin'}){
  const box=useRef<HTMLDivElement>(null);
  const router=useRouter();

  useEffect(()=>{
    requestAnimationFrame(()=>{
      if(box.current) box.current.scrollTop=box.current.scrollHeight;
    });
  },[messages.length]);

  useEffect(()=>{
    const timer=window.setInterval(()=>router.refresh(),5000);
    return()=>window.clearInterval(timer);
  },[router]);

  return <div className="supportMessages" ref={box}>
    {messages.length===0&&
      <div className="supportEmpty">
        <b>Диалог пока пуст</b>
        <span>{role==='client'
          ?'Напиши вопрос или оставь обратную связь — здесь ответит человек.'
          :'Клиент ещё ничего не писал через сайт.'}</span>
      </div>}
    {messages.map(m=>{
      const own=m.sender===role;
      return <article className={`supportBubble ${own?'own':'other'}`} key={m.id}>
        <div>
          <b>{m.sender==='client'?'Клиент':'Администратор'}</b>
          <time>{new Date(m.created_at).toLocaleString('ru-RU',{
            day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'
          })}</time>
        </div>
        <p>{m.content}</p>
      </article>;
    })}
  </div>;
}
