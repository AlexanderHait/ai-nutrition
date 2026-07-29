"use client";
import {useState} from "react";
import {ShieldCheck, ShieldOff} from "lucide-react";

export default function AdminRoleControl({chatId,current=false}:{chatId:number|string;current?:boolean}){
  const [enabled,setEnabled]=useState(current);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  async function toggle(){
    if(saving)return;
    setSaving(true); setError("");
    const next=!enabled;
    try{
      const r=await fetch("/api/admin/admin-role",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({chatId,enabled:next})
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d.ok)throw new Error(d.error||"Не удалось изменить роль");
      setEnabled(next);
    }catch(e){
      setError(e instanceof Error?e.message:"Не удалось изменить роль");
    }finally{
      setSaving(false);
    }
  }

  return <div style={{display:"grid",gap:10,width:"100%"}}>
    <div style={{display:"flex",gap:10,alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap"}}>
      <div>
        <b style={{display:"block",fontSize:15}}>Администраторская панель</b>
        <span style={{display:"block",marginTop:4,fontSize:13,opacity:.62,maxWidth:650}}>
          {enabled
            ?"Этот клиент имеет доступ к админке и после входа через Telegram будет открывать административную панель."
            :"Обычный клиентский аккаунт. Доступ к админке отсутствует."}
        </span>
      </div>
      <span style={{
        padding:"5px 9px",borderRadius:999,fontSize:12,fontWeight:700,
        border:enabled?"1px solid rgba(232,194,91,.5)":"1px solid rgba(255,255,255,.14)",
        color:enabled?"#e8c25b":"inherit",opacity:enabled?1:.65
      }}>{enabled?"АДМИН":"КЛИЕНТ"}</span>
    </div>

    <button type="button" onClick={toggle} disabled={saving}
      style={{
        width:"100%",minHeight:48,padding:"11px 18px",borderRadius:13,
        display:"flex",alignItems:"center",justifyContent:"center",gap:9,
        border:enabled?"1px solid rgba(226,92,92,.55)":"1px solid rgba(232,194,91,.55)",
        background:enabled?"rgba(226,92,92,.08)":"rgba(232,194,91,.10)",
        color:enabled?"#ef9a9a":"#e8c25b",
        fontWeight:800,fontSize:14,cursor:saving?"wait":"pointer"
      }}>
      {enabled?<ShieldOff size={18}/>:<ShieldCheck size={18}/>}
      {saving?"Сохраняю…":enabled?"Снять права администратора":"Назначить администратором"}
    </button>

    {error?<div style={{fontSize:13,color:"#ef7777"}}>{error}</div>:null}
  </div>
}
