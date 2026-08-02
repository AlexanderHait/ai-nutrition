"use client";

import {useEffect,useState} from "react";
import {ExternalLink,FileText} from "lucide-react";

type Props={path:string;name?:string|null;mime?:string|null};

export function SupportAttachment({path,name,mime}:Props){
  const [url,setUrl]=useState<string|null>(null);
  const [open,setOpen]=useState(false);
  const [failed,setFailed]=useState(false);
  const isPdf=String(mime||"").toLowerCase()==="application/pdf"||String(name||"").toLowerCase().endsWith(".pdf");

  useEffect(()=>{
    let cancelled=false;
    setUrl(null);
    setFailed(false);
    async function requestSignedUrl(){
      const res=await fetch("/api/support/media/signed-url",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({path}),cache:"no-store"});
      if(!res.ok)throw new Error("signed-url failed");
      const data=await res.json();
      if(!data?.url)throw new Error("signed-url missing");
      return String(data.url);
    }
    async function load(){
      try{
        let signed:string;
        try{signed=await requestSignedUrl()}catch{await new Promise(r=>setTimeout(r,350));signed=await requestSignedUrl()}
        if(!cancelled)setUrl(signed);
      }catch{if(!cancelled)setFailed(true)}
    }
    void load();
    return()=>{cancelled=true};
  },[path]);

  if(failed)return <div className="supportAttachmentError">Не удалось загрузить файл</div>;
  if(!url)return <div className="supportAttachmentLoading"/>;

  if(isPdf){
    return <a href={url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:10,padding:12,border:"1px solid rgba(148,163,184,.22)",borderRadius:14,color:"inherit",textDecoration:"none",marginBottom:7}}>
      <FileText size={28}/><span style={{minWidth:0,flex:1}}><b style={{display:"block",overflow:"hidden",textOverflow:"ellipsis"}}>{name||"Документ PDF"}</b><small className="muted">Открыть документ</small></span><ExternalLink size={16}/>
    </a>;
  }

  return <>
    <button type="button" onClick={()=>setOpen(true)} className="supportAttachmentThumb" aria-label="Открыть изображение"><img src={url} alt={name||"Вложение поддержки"} loading="lazy" className="supportAttachmentImage"/></button>
    {open&&<div className="supportLightbox" onClick={()=>setOpen(false)} role="dialog" aria-modal="true"><button type="button" onClick={()=>setOpen(false)} className="supportLightboxClose" aria-label="Закрыть">✕</button><img src={url} alt={name||"Вложение поддержки"} className="supportLightboxImage" onClick={e=>e.stopPropagation()}/></div>}
  </>;
}
