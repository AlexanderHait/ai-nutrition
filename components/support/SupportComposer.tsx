"use client";
import {ChangeEvent,FormEvent,useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {Paperclip,X} from "lucide-react";
type Props={chatId:number|null}; const MAX_BYTES=10*1024*1024;
export function SupportComposer({chatId}:Props){
 const router=useRouter(),[text,setText]=useState(""),[file,setFile]=useState<File|null>(null),[sending,setSending]=useState(false),[error,setError]=useState<string|null>(null),input=useRef<HTMLInputElement>(null);
 const preview=useMemo(()=>file?URL.createObjectURL(file):null,[file]); useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 function chooseFile(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0]||null;setError(null);if(!f){setFile(null);return}if(!f.type.startsWith("image/")){setError("Можно прикрепить только фото.");e.target.value="";return}if(f.size>MAX_BYTES){setError("Фото должно быть не больше 10 МБ.");e.target.value="";return}setFile(f)}
 async function send(e:FormEvent){e.preventDefault();if(!chatId||sending||(!text.trim()&&!file))return;setSending(true);setError(null);try{const form=new FormData();form.set("chat_id",String(chatId));form.set("content",text.trim());if(file)form.set("file",file);const res=await fetch("/api/support/send",{method:"POST",body:form});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data?.error||"Не удалось отправить сообщение");setText("");setFile(null);if(input.current)input.current.value="";router.refresh()}catch(err){setError(err instanceof Error?err.message:"Не удалось отправить сообщение")}finally{setSending(false)}}
 return <form onSubmit={send} className="supportComposerV2">
 {file&&preview?<div className="supportPreview"><img src={preview} alt="Предпросмотр"/><span><b>{file.name}</b><small>{(file.size/1024/1024).toFixed(1)} МБ</small></span><button type="button" onClick={()=>{setFile(null);if(input.current)input.current.value=""}} aria-label="Убрать фото"><X size={16}/></button></div>:null}
 {error?<div className="supportComposerError">{error}</div>:null}
 <div className="supportComposerRow"><input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={chooseFile}/>
 <button className="supportAttachButton" type="button" onClick={()=>input.current?.click()} disabled={!chatId||sending} title="Прикрепить фото"><Paperclip size={19}/></button>
 <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Ответить клиенту…" rows={1} maxLength={3000} disabled={!chatId||sending} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/>
 <button className="primary supportSendButton" type="submit" disabled={!chatId||sending||(!text.trim()&&!file)}>{sending?"Отправка…":"Отправить"}</button></div></form>
}
