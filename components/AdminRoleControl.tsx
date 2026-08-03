"use client";
import {useState} from "react";
import {ShieldCheck,ShieldOff} from "lucide-react";

export default function AdminRoleControl({chatId,current=false}:{chatId:number|string;current?:boolean}){
  const [enabled,setEnabled]=useState(current);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  async function toggle(){
    if(saving)return;
    setSaving(true);setError("");
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
    }finally{setSaving(false)}
  }

  return <div className="adminRoleControl" style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      style={{
        minHeight:38,
        padding:"8px 13px",
        borderRadius:11,
        display:"inline-flex",
        alignItems:"center",
        justifyContent:"center",
        gap:7,
        width:"auto",
        border:enabled?"1px solid rgba(226,92,92,.5)":"1px solid rgba(232,194,91,.5)",
        background:enabled?"rgba(226,92,92,.07)":"rgba(232,194,91,.09)",
        color:enabled?"#ef9a9a":"#e8c25b",
        fontWeight:750,
        fontSize:13,
        cursor:saving?"wait":"pointer"
      }}
    >
      {enabled?<ShieldOff size={15}/>:<ShieldCheck size={15}/>}
      {saving?"Сохраняю…":enabled?"Снять права админа":"Назначить админом"}
    </button>

    <span style={{fontSize:12,opacity:.6}}>
      {enabled?"Администратор":"Обычный клиент"}
    </span>

    {error?<div style={{width:"100%",fontSize:12,color:"#ef7777"}}>{error}</div>:null}
  </div>
}
