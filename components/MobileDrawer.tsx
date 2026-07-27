"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {LogOut,Menu,X} from "lucide-react";
import NavLinks,{type NavItem} from "@/components/NavLinks";

export default function MobileDrawer({role,groups,unreadDialogs=0,isPremium=false}:{role:"admin"|"client";groups:readonly {label:string;items:readonly NavItem[]}[];unreadDialogs?:number;isPremium?:boolean}){
  const [open,setOpen]=useState(false);
  useEffect(()=>{document.body.style.overflow=open?"hidden":"";return()=>{document.body.style.overflow=""}},[open]);
  return <>
    <header className="mobileTopbar">
      <button className="mobileMenuButton" type="button" onClick={()=>setOpen(true)} aria-label="Открыть меню"><Menu size={21}/></button>
      <Link href={role==="admin"?"/admin":"/client"} className="mobileBrand"><span>AI</span><strong>Nutrition</strong></Link>
      {role==="admin"&&unreadDialogs>0?<Link href="/admin/dialogs" className="mobileUnreadShortcut" aria-label={`Непрочитанных диалогов: ${unreadDialogs}`}>{unreadDialogs>99?"99+":unreadDialogs}</Link>:<span className="mobileTopbarSpacer"/>}
    </header>
    {open&&<button className="mobileDrawerBackdrop" aria-label="Закрыть меню" onClick={()=>setOpen(false)}/>}
    <aside className={`mobileDrawer ${open?"open":""}`} aria-hidden={!open}>
      <div className="mobileDrawerHead"><div><small>{role==="admin"?"Панель управления":"Личный кабинет"}</small><b>Навигация</b></div><button type="button" onClick={()=>setOpen(false)} aria-label="Закрыть меню"><X size={20}/></button></div>
      <nav className="mobileDrawerNav" onClick={()=>setOpen(false)}>{groups.map(group=><section key={group.label}><span className="navSectionLabel">{group.label}</span><NavLinks items={group.items} unreadDialogs={unreadDialogs} isPremium={isPremium}/></section>)}</nav>
      <div className="mobileDrawerBottom"><form action="/api/auth/logout" method="post"><button className="sideLogout" type="submit"><LogOut size={18} strokeWidth={1.8}/>Выйти</button></form></div>
    </aside>
  </>;
}
