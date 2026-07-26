import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import NavLinks from "@/components/NavLinks";
import AdminCommandPalette from "@/components/AdminCommandPalette";
import {
  BarChart3,BookOpen,Home,LogOut,MessageSquare,TrendingUp,UserRound,Users,Utensils,Headphones,Send
} from "lucide-react";

export default async function Shell({
  children,role,
}:{
  children:React.ReactNode;role:"admin"|"client";
}){
  const admin=[
    ["/admin","Главная",Home],
    ["/admin/clients","Клиенты",Users],
    ["/admin/dialogs","Диалоги",MessageSquare],
    ["/admin/analytics","Аналитика",BarChart3],
    ["/admin/mailings","Рассылки",Send],
    ["/admin/subscriptions","Подписки",BookOpen],
  ] as const;
  const client=[
    ["/client","Главная",Home],
    ["/client/nutrition","Питание",Utensils],
    ["/client/progress","Прогресс",TrendingUp],
    ["/client/support","Поддержка",Headphones],
    ["/client/profile","Профиль",UserRound],
  ] as const;

  let unreadDialogs=0;
  let paletteClients:{id:number;name:string;username:string}[]=[];
  if(role==="admin"){
    const s=getSupabaseAdmin();
    const [{count},{data:profiles}]=await Promise.all([
      s.from("support_messages").select("id",{count:"exact",head:true}).eq("sender","client").is("read_by_admin_at",null),
      s.from("profiles").select("telegram_id,first_name,username").order("created_at",{ascending:false}).limit(300)
    ]);
    unreadDialogs=count||0;
    paletteClients=(profiles||[]).map((p:any)=>({
      id:Number(p.telegram_id),
      name:String(p.first_name||p.username||`Telegram ${p.telegram_id}`),
      username:p.username?`@${p.username}`:""
    }));
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
      {role==="admin"&&<div className="adminToolbar"><AdminCommandPalette clients={paletteClients}/></div>}
      {children}
    </main>

    <nav className={"mobileNav "+(role==="admin"?"adminMobileNav":"clientMobileNav")}>
      <NavLinks items={items} unreadDialogs={unreadDialogs} mobile/>
    </nav>
  </div>;
}
