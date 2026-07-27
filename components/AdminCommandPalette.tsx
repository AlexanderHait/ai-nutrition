"use client";

import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {Activity,BarChart3,Database,Mail,MessageSquare,Search,Users,X} from "lucide-react";

type Client={id:number;name:string;username:string};
type IconName="users"|"dialogs"|"analytics"|"mail"|"activity"|"catalog";
type CommandResult={label:string;href:string;icon:IconName;sub?:string};

const actions:CommandResult[]=[
  {label:"Открыть клиентов",href:"/admin/clients",icon:"users"},
  {label:"Открыть диалоги",href:"/admin/dialogs",icon:"dialogs"},
  {label:"Открыть активность",href:"/admin/activity",icon:"activity"},
  {label:"Открыть аналитику",href:"/admin/analytics",icon:"analytics"},
  {label:"Открыть Food Cache",href:"/admin/catalog",icon:"catalog"},
  {label:"Создать рассылку",href:"/admin/mailings",icon:"mail"},
];

export default function AdminCommandPalette(){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [clients,setClients]=useState<Client[]>([]);
  const [loading,setLoading]=useState(false);
  const router=useRouter();

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setOpen(v=>!v)}
      if(e.key==="Escape")setOpen(false);
    };
    window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
  },[]);

  useEffect(()=>{
    if(!open)return;
    const ctrl=new AbortController();
    const timer=setTimeout(async()=>{
      setLoading(true);
      try{
        const r=await fetch(`/api/admin/client-search?q=${encodeURIComponent(query.trim())}`,{signal:ctrl.signal,cache:"no-store"});
        const j=await r.json();
        setClients(Array.isArray(j?.clients)?j.clients:[]);
      }catch(e:any){if(e?.name!=="AbortError")setClients([])}finally{setLoading(false)}
    },query.trim()?180:0);
    return()=>{clearTimeout(timer);ctrl.abort()};
  },[open,query]);

  const results=useMemo(()=>{
    const q=query.trim().toLowerCase();
    const actionRows=actions.filter(a=>!q||a.label.toLowerCase().includes(q));
    const clientRows:CommandResult[]=clients.slice(0,7).map(c=>({label:c.name,sub:c.username||`Telegram ${c.id}`,href:`/admin/clients/${c.id}`,icon:"users"}));
    return [...actionRows,...clientRows];
  },[clients,query]);

  function go(href:string){setOpen(false);setQuery("");router.push(href)}
  return <>
    <button className="commandTrigger" type="button" onClick={()=>setOpen(true)}><Search size={15}/><span>Поиск клиента или раздела</span><kbd>⌘K</kbd></button>
    {open&&<div className="commandBackdrop" onMouseDown={()=>setOpen(false)}><div className="commandPanel" onMouseDown={e=>e.stopPropagation()}>
      <div className="commandInput"><Search size={19}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Клиент, диалоги, рассылка…"/><button type="button" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <div className="commandResults">
        {loading&&<div className="commandEmpty">Ищу…</div>}
        {!loading&&results.length?results.map((r,i)=>{const Icon=r.icon==="dialogs"?MessageSquare:r.icon==="analytics"?BarChart3:r.icon==="mail"?Mail:r.icon==="activity"?Activity:r.icon==="catalog"?Database:Users;return <button key={`${r.href}-${i}`} type="button" onClick={()=>go(r.href)}><i><Icon size={17}/></i><span><b>{r.label}</b>{r.sub?<small>{r.sub}</small>:null}</span></button>}):!loading&&<div className="commandEmpty">Ничего не найдено</div>}
      </div>
    </div></div>}
  </>;
}
