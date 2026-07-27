"use client";

import {ChangeEvent,FormEvent,useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {Paperclip,X} from "lucide-react";

type Props={
  chatId:number|null;
  endpoint?:string;
  placeholder?:string;
};

const MAX_BYTES=10*1024*1024;

export function SupportComposer({
  chatId,
  endpoint="/api/support/send",
  placeholder="Ответить клиенту…",
}:Props){
  const router=useRouter();
  const [text,setText]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const input=useRef<HTMLInputElement>(null);

  const preview=useMemo(()=>file?URL.createObjectURL(file):null,[file]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);

  function clearFile(){
    setFile(null);
    if(input.current)input.current.value="";
  }

  function chooseFile(e:ChangeEvent<HTMLInputElement>){
    const next=e.target.files?.[0]||null;
    setError(null);
    if(!next){setFile(null);return}

    if(!next.type.startsWith("image/")){
      setError("Можно прикрепить только фото.");
      e.target.value="";
      return;
    }
    if(next.size>MAX_BYTES){
      setError("Фото должно быть не больше 10 МБ.");
      e.target.value="";
      return;
    }
    setFile(next);
  }

  async function send(e:FormEvent){
    e.preventDefault();
    if(!chatId||sending||(!text.trim()&&!file))return;

    // Keep the selected file/preview until the server proves it was persisted.
    const fileBeingSent=file;
    setSending(true);
    setError(null);

    try{
      const form=new FormData();
      form.set("chat_id",String(chatId));
      form.set("content",text.trim());
      if(fileBeingSent)form.set("file",fileBeingSent);

      const res=await fetch(endpoint,{method:"POST",body:form});
      const data=await res.json().catch(()=>({}));

      if(!res.ok||data?.ok!==true||!data?.message?.id){
        throw new Error(data?.error||"Не удалось сохранить сообщение");
      }

      if(fileBeingSent&&!data.message.attachment_path){
        throw new Error("Фото не было сохранено. Попробуйте ещё раз.");
      }

      // Only now may we clear the local preview.
      setText("");
      clearFile();

      // Force server components to re-read support_messages, where the
      // permanent attachment_path is already stored.
      router.refresh();
    }catch(err){
      // On failure the file stays selected so the admin/client can retry.
      setError(err instanceof Error?err.message:"Не удалось отправить сообщение");
    }finally{
      setSending(false);
    }
  }

  return <form onSubmit={send} className="supportComposerV2">
    {file&&preview?
      <div className="supportPreview">
        <img src={preview} alt="Предпросмотр"/>
        <span>
          <b>{file.name}</b>
          <small>{(file.size/1024/1024).toFixed(1)} МБ</small>
        </span>
        <button type="button" onClick={clearFile} aria-label="Убрать фото">
          <X size={16}/>
        </button>
      </div>:null}

    {error?<div className="supportComposerError">{error}</div>:null}

    <div className="supportComposerRow">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        hidden
        onChange={chooseFile}
      />

      <button
        className="supportAttachButton"
        type="button"
        onClick={()=>input.current?.click()}
        disabled={!chatId||sending}
        title="Прикрепить фото"
        aria-label="Прикрепить фото"
      >
        <Paperclip size={19}/>
      </button>

      <textarea
        value={text}
        onChange={e=>setText(e.target.value)}
        placeholder={placeholder}
        rows={1}
        maxLength={3000}
        disabled={!chatId||sending}
        onKeyDown={e=>{
          if(e.key==="Enter"&&!e.shiftKey){
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />

      <button
        className="primary supportSendButton"
        type="submit"
        disabled={!chatId||sending||(!text.trim()&&!file)}
      >
        {sending?"Отправка…":"Отправить"}
      </button>
    </div>
  </form>;
}
