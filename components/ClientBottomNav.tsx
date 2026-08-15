"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, Home, TrendingUp, UserRound, Utensils } from "lucide-react";

const items = [
  { href: "/client", label: "Сегодня", icon: Home },
  { href: "/client/nutrition", label: "Питание", icon: Utensils },
  { href: "/client/coach-v3", label: "Coach", icon: BrainCircuit },
  { href: "/client/progress", label: "Прогресс", icon: TrendingUp },
  { href: "/client/profile", label: "Профиль", icon: UserRound },
];

function active(pathname: string, href: string) {
  if (href === "/client") return pathname === href;
  if (href === "/client/nutrition") return pathname.startsWith("/client/nutrition") || pathname.startsWith("/client/history");
  if (href === "/client/coach-v3") return pathname.startsWith("/client/coach");
  if (href === "/client/profile") {
    return pathname.startsWith("/client/profile")
      || pathname.startsWith("/client/plan")
      || pathname.startsWith("/client/support")
      || pathname.startsWith("/client/onboarding")
      || pathname.startsWith("/client/checkout");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ClientBottomNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="clientBottomNav" aria-label="Основная навигация">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active(pathname, item.href);
          return (
            <Link
              href={item.href}
              key={item.href}
              className={isActive ? "active" : undefined}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <style>{`
        .clientBottomNav{display:none}
        @media(max-width:900px){
          .clientBottomNav{
            position:fixed;
            z-index:80;
            left:10px;
            right:10px;
            bottom:max(8px,env(safe-area-inset-bottom));
            display:grid;
            grid-template-columns:repeat(5,minmax(0,1fr));
            min-height:62px;
            padding:6px 4px;
            border:1px solid var(--line);
            border-radius:17px;
            background:var(--surface);
            box-shadow:var(--shadow);
          }
          .clientBottomNav a{
            display:grid;
            place-items:center;
            align-content:center;
            gap:3px;
            min-width:0;
            border-radius:12px;
            color:var(--muted);
            font-size:12.5px;
            font-weight:700;
            transition:background-color .18s ease,color .18s ease,transform .18s ease;
          }
          .clientBottomNav a:active{transform:scale(.97)}
          .clientBottomNav a.active{
            background:var(--accent-soft);
            color:var(--gold2);
          }
          .clientBottomNav a span{
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            max-width:100%;
          }
        }
      `}</style>
    </>
  );
}
