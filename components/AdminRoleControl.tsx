"use client";
import {useState} from "react";
import {ShieldCheck} from "lucide-react";

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
    }finally{setSaving(false)}
  }

  return <div style={{display:"grid",gap:6,minWidth:170}}>
    <span style={{fontSize:12,opacity:.62}}>Роль на сайте</span>
    <button type="button" onClick={toggle} disabled={saving}
      style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,padding:"9px 13px",borderRadius:12,border:enabled?"1px solid #e8c25b":"1px solid #555",background:enabled?"rgba(232,194,91,.12)":"transparent",color:enabled?"#e8c25b":"inherit",fontWeight:700,cursor:saving?"wait":"pointer"}}>
      <ShieldCheck size={16}/>{saving?"Сохраняю…":enabled?"Админ ✓":"Назначить админом"}
    </button>
    {error?<small style={{color:"#e66"}}>{error}</small>:null}
  </div>
}
