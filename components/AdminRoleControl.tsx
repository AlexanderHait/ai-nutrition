"use client";
import {useState} from "react";

export default function AdminRoleControl({chatId,current=false}:{chatId:number|string;current?:boolean}){
  const [enabled,setEnabled]=useState(current),[saving,setSaving]=useState(false),[error,setError]=useState("");
  async function toggle(){
    if(saving)return;
    setSaving(true);setError("");
    const next=!enabled;
    try{
      const r=await fetch("/api/admin/admin-role",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chatId,enabled:next})});
      const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(d.error||"Ошибка");
      setEnabled(next);
    }catch(e){setError(e instanceof Error?e.message:"Не удалось изменить роль")}finally{setSaving(false)}
  }
  return <div style={{display:"grid",gap:8}}>
    <div style={{fontSize:13,opacity:.65}}>Доступ к админ-панели</div>
    <button type="button" onClick={toggle} disabled={saving}
      style={{padding:"8px 14px",borderRadius:12,border:enabled?"2px solid currentColor":"1px solid #9995",background:"transparent",color:"inherit",fontWeight:enabled?700:500,width:"fit-content"}}>
      {enabled?"Админ ✓":"Назначить админом"}
    </button>
    {error?<div style={{color:"#d33",fontSize:13}}>{error}</div>:null}
  </div>
}
