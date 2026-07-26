"use client";

import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {BarChart3,Mail,MessageSquare,Search,Users,X} from "lucide-react";
import type {LucideIcon} from "lucide-react";

type Client={id:number;name:string;username:string};
type CommandResult={label:string;href:string;icon:LucideIcon;sub?:string};

const actions:CommandResult[]=[
  {label:"Открыть клиентов",href:"/admin/clients",icon:Users},
  {label:"Открыть диалоги",href:"/admin/dialogs",icon:MessageSquare},
  {label:"Открыть аналитику",href:"/admin/analytics",icon:BarChart3},
  {label:"Создать рассылку",href:"/admin/mailings",icon:Mail},
];

export default function AdminCommandPalette({clients}:{clients:Client[]}){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const router=useRouter();

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){
        e.preventDefault();setOpen(v=>!v);
      }
      if(e.key==="Escape")setOpen(false);
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[]);

  const results=useMemo(()=>{
    const q=query.trim().toLowerCase();
    const clientRows:CommandResult[]=clients
      .filter(c=>!q||c.name.toLowerCase().includes(q)||c.username.toLowerCase().includes(q))
      .slice(0,7)
      .map(c=>({label:c.name,sub:c.username||`Telegram ${c.id}`,href:`/admin/clients/${c.id}`,icon:Users}));
    const actionRows:CommandResult[]=actions.filter(a=>!q||a.label.toLowerCase().includes(q));
    return [...actionRows,...clientRows];
  },[clients,query]);

  function go(href:string){setOpen(false);setQuery("");router.push(href)}

  return <>
    <button className="commandTrigger" type="button" onClick={()=>setOpen(true)}>
      <Search size={15}/><span>Поиск клиента или раздела</span><kbd>⌘K</kbd>
    </button>
    {open&&<div className="commandBackdrop" onMouseDown={()=>setOpen(false)}>
      <div className="commandPanel" onMouseDown={e=>e.stopPropagation()}>
        <div className="commandInput">
          <Search size={19}/>
          <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Клиент, диалоги, рассылка…"/>
          <button type="button" onClick={()=>setOpen(false)}><X size={18}/></button>
        </div>
        <div className="commandResults">
          {results.length?results.map((r,i)=>{
            const Icon=r.icon;
            return <button key={`${r.href}-${i}`} type="button" onClick={()=>go(r.href)}>
              <i><Icon size={17}/></i><span><b>{r.label}</b>{r.sub ? <small>{r.sub}</small> : null}</span>
            </button>
          }):<div className="commandEmpty">Ничего не найдено</div>}
        </div>
      </div>
    </div>}
  </>;
}
