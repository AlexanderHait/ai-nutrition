"use client";

import {ChangeEvent,FormEvent,useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {FileText,Paperclip,X} from "lucide-react";

type Props={
  chatId:number|null;
  endpoint?:string;
  placeholder?:string;
  firstContact?:boolean;
};

const MAX_BYTES=10*1024*1024;
const ALLOWED=new Set(["image/jpeg","image/png","image/webp","image/heic","image/heif","application/pdf"]);

export function SupportComposer({
  chatId,
  endpoint="/api/support/send",
  placeholder="Ответить клиенту…",
  firstContact=false,
}:Props){
  const router=useRouter();
  const [text,setText]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const input=useRef<HTMLInputElement>(null);
  const requestId=useRef(crypto.randomUUID());

  const isImage=Boolean(file?.type.startsWith("image/"));
  const preview=useMemo(()=>file&&isImage?URL.createObjectURL(file):null,[file,isImage]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);

  function clearFile(){
    setFile(null);
    if(input.current)input.current.value="";
  }

  function chooseFile(e:ChangeEvent<HTMLInputElement>){
    const next=e.target.files?.[0]||null;
    setError(null);
    if(!next){setFile(null);return}
    if(firstContact){
      setError("Сначала отправьте текстовое сообщение. После этого можно прикреплять фото и PDF.");
      e.target.value="";
      return;
    }
    if(!ALLOWED.has(next.type)){
      setError("Можно прикрепить фото или PDF.");
      e.target.value="";
      return;
    }
    if(next.size>MAX_BYTES){
      setError("Файл должен быть не больше 10 МБ.");
      e.target.value="";
      return;
    }
    setFile(next);
  }

  async function send(e:FormEvent){
    e.preventDefault();
    if(!chatId||sending||(!text.trim()&&!file))return;

    const fileBeingSent=file;
    const activeRequestId=requestId.current;
    setSending(true);
    setError(null);

    try{
      let res:Response;
      if(firstContact){
        res=await fetch("/api/support/first-contact",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({chat_id:chatId,content:text.trim(),request_id:activeRequestId}),
        });
      }else{
        const form=new FormData();
        form.set("chat_id",String(chatId));
        form.set("content",text.trim());
        form.set("request_id",activeRequestId);
        if(fileBeingSent)form.set("file",fileBeingSent);
        res=await fetch(endpoint,{method:"POST",body:form});
      }

      const data=await res.json().catch(()=>({}));
      if(!res.ok||data?.ok!==true||!data?.message?.id){
        throw new Error(data?.error||"Не удалось сохранить сообщение");
      }
      if(fileBeingSent&&!data.message.attachment_path){
        throw new Error("Файл не был сохранён. Попробуйте ещё раз.");
      }

      setText("");
      clearFile();
      requestId.current=crypto.randomUUID();
      router.refresh();
    }catch(err){
      setError(err instanceof Error?err.message:"Не удалось отправить сообщение");
    }finally{
      setSending(false);
    }
  }

  return <form onSubmit={send} className="supportComposerV2">
    {file?
      <div className="supportPreview">
        {preview?<img src={preview} alt="Предпросмотр"/>:<FileText size={32}/>} 
        <span><b>{file.name}</b><small>{(file.size/1024/1024).toFixed(1)} МБ</small></span>
        <button type="button" onClick={clearFile} aria-label="Убрать файл"><X size={16}/></button>
      </div>:null}

    {firstContact?<div className="muted" style={{fontSize:12,marginBottom:6}}>Первое сообщение будет отправлено клиенту напрямую в Telegram.</div>:null}
    {error?<div className="supportComposerError">{error}</div>:null}

    <div className="supportComposerRow">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" hidden onChange={chooseFile}/>
      <button className="supportAttachButton" type="button" onClick={()=>input.current?.click()} disabled={!chatId||sending||firstContact} title={firstContact?"Вложения доступны после первого сообщения":"Прикрепить фото или PDF"} aria-label="Прикрепить фото или PDF"><Paperclip size={19}/></button>
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={firstContact?"Написать первое сообщение…":placeholder} rows={1} maxLength={3000} disabled={!chatId||sending} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/>
      <button className="primary supportSendButton" type="submit" disabled={!chatId||sending||(!text.trim()&&!file)}>{sending?"Отправка…":"Отправить"}</button>
    </div>
  </form>;
}
