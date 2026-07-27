import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import NavLinks from "@/components/NavLinks";
import AdminCommandPalette from "@/components/AdminCommandPalette";
import {
  LogOut
} from "lucide-react";

export default async function Shell({
  children,role,
}:{
  children:React.ReactNode;role:"admin"|"client";
}){
  const admin=[
    ["/admin","Главная","home"],
    ["/admin/clients","Клиенты","clients"],
    ["/admin/dialogs","Диалоги","dialogs"],
    ["/admin/activity","Активность","activity"],
    ["/admin/analytics","Аналитика","analytics"],
    ["/admin/catalog","Food Cache","catalog"],
    ["/admin/subscriptions","Подписки","subscriptions"],
    ["/admin/premium-health","Premium Health","activity"],
    ["/admin/system","Система","activity"],
    ["/admin/knowledge","База знаний","catalog"],
    ["/admin/replay","Replay","activity"],
    ["/admin/mailings","Рассылки","mailings"],
  ] as const;
  const client=[
    ["/client","Главная","home"],
    ["/client/coach","TeddY Coach","coach"],
    ["/client/onboarding","Настройка Coach","profile"],
    ["/client/nutrition","Питание","nutrition"],
    ["/client/progress","Прогресс","progress"],
    ["/client/plan","Подписка","plan"],
    ["/client/support","Поддержка","support"],
    ["/client/profile","Профиль","profile"],
  ] as const;

  let unreadDialogs=0;
  if(role==="admin"){
    const s=getSupabaseAdmin();
    const {count}=await s.from("support_messages").select("id",{count:"exact",head:true}).eq("sender","client").is("read_by_admin_at",null);
    unreadDialogs=count||0;
  }

  const items=role==="admin"?admin:client;

  return <div className="app">
    <aside className="side">
      <Link href={role==="admin"?"/admin":"/client"} className="brand">
        <span>AI</span><strong>Nutrition</strong>
      </Link>
      <nav className="desktopNav"><NavLinks items={items} unreadDialogs={unreadDialogs}/></nav>
      <div className="sideBottom">
        <form action="/api/auth/logout" method="post">
          <button className="sideLogout" type="submit"><LogOut size={18} strokeWidth={1.8}/>Выйти</button>
        </form>
      </div>
    </aside>

    <header className="mobileTopbar">
      <Link href={role==="admin"?"/admin":"/client"} className="mobileBrand"><span>AI</span><strong>Nutrition</strong></Link>
      <form action="/api/auth/logout" method="post"><button className="mobileLogout" type="submit" aria-label="Выйти"><LogOut size={18}/></button></form>
    </header>

    <main className="content">
      {role==="admin"&&<div className="adminToolbar"><AdminCommandPalette/></div>}
      {children}
    </main>

    <nav className={"mobileNav "+(role==="admin"?"adminMobileNav":"clientMobileNav")}>
      <NavLinks items={items} unreadDialogs={unreadDialogs} mobile/>
    </nav>
  </div>;
}
