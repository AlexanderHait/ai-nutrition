import Link from "next/link";
import {getSupabaseAdmin} from "@/lib/supabase-admin";
import NavLinks,{type NavItem} from "@/components/NavLinks";
import MobileDrawer from "@/components/MobileDrawer";
import AdminCommandPalette from "@/components/AdminCommandPalette";
import {LogOut} from "lucide-react";

type NavGroup={label:string;items:readonly NavItem[]};
export default async function Shell({children,role,isPremium=false}:{children:React.ReactNode;role:"admin"|"client";isPremium?:boolean}){
  const adminGroups:readonly NavGroup[]=[
    {label:"Работа",items:[["/admin","Главная","home"],["/admin/dialogs","Диалоги","dialogs"],["/admin/clients","Клиенты","clients"],["/admin/activity","Активность","activity"],["/admin/analytics","Аналитика","analytics"]]},
    {label:"Контент и коммуникации",items:[["/admin/catalog","Продукты","catalog"],["/admin/knowledge","База знаний","catalog"],["/admin/mailings","Рассылки","mailings"],["/admin/replay","Повтор обработки","activity"]]},
    {label:"Управление",items:[["/admin/subscriptions","Подписки","subscriptions"],["/admin/premium-health","Premium · контроль","activity"],["/admin/system","Система","settings"]]},
  ];
  const clientGroups:readonly NavGroup[]=[
    {label:"Основное",items:[["/client","Главная","home"],["/client/nutrition","Питание","nutrition"],["/client/progress","Прогресс","progress"],["/client/coach","TeddY Coach","coach",{premium:true}]]},
    {label:"Аккаунт",items:[["/client/profile","Профиль","profile"],["/client/plan","Подписка","plan"],["/client/support","Поддержка","support"]]},
  ];
  let unreadDialogs=0;
  if(role==="admin"){
    const s=getSupabaseAdmin();
    const {count}=await s.from("support_messages").select("id",{count:"exact",head:true}).eq("sender","client").is("read_by_admin_at",null);
    unreadDialogs=count||0;
  }
  const groups=role==="admin"?adminGroups:clientGroups;
  return <div className="app">
    <aside className="side">
      <Link href={role==="admin"?"/admin":"/client"} className="brand"><span>AI</span><strong>Nutrition</strong></Link>
      <nav className="desktopNav">{groups.map(group=><section className="navSection" key={group.label}><span className="navSectionLabel">{group.label}</span><NavLinks items={group.items} unreadDialogs={unreadDialogs} isPremium={isPremium}/></section>)}</nav>
      <div className="sideBottom"><form action="/api/auth/logout" method="post"><button className="sideLogout" type="submit"><LogOut size={18} strokeWidth={1.8}/>Выйти</button></form></div>
    </aside>
    <MobileDrawer role={role} groups={groups} unreadDialogs={unreadDialogs} isPremium={isPremium}/>
    <main className="content">{role==="admin"&&<div className="adminToolbar"><AdminCommandPalette/></div>}{children}</main>
  </div>;
}
