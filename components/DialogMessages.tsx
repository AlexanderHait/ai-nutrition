'use client';

import {useEffect, useRef} from 'react';

type Message = {
  id: string | number;
  role?: string;
  content?: string;
  created_at: string;
};

function cleanTelegramMarkdown(value?: string) {
  return String(value || '')
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/__(.*?)__/gs, '$1')
    .replace(/\*(.*?)\*/gs, '$1')
    .replace(/_(.*?)_/gs, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

export default function DialogMessages({messages, chatId}:{messages:Message[]; chatId:number}){
  const boxRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const box=boxRef.current;
    if(!box)return;
    // Open each conversation at the newest message, like a normal messenger.
    requestAnimationFrame(()=>{
      box.scrollTop=box.scrollHeight;
    });
  },[chatId, messages.length]);

  return <div className="messages" ref={boxRef}>
    {messages.slice(-100).map((m)=>{
      const isUser=m.role==='user';
      return <article key={m.id} className={`messageBubble ${isUser?'user':'assistant'}`}>
        <div>
          <b>{isUser?'Клиент':'AI'}</b>
          <time>{new Date(m.created_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'})}</time>
        </div>
        <p>{cleanTelegramMarkdown(m.content)}</p>
      </article>;
    })}
  </div>;
}
