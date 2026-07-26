import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Home,
  LogOut,
  MessageSquare,
  TrendingUp,
  UserRound,
  Users,
  Utensils,
} from "lucide-react";

export default function Shell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "admin" | "client";
}) {
  const admin = [
    ["/admin", "Главная", Home],
    ["/admin/clients", "Клиенты", Users],
    ["/admin/dialogs", "Диалоги", MessageSquare],
    ["/admin/analytics", "Аналитика", BarChart3],
    ["/admin/subscriptions", "Подписки", BookOpen],
  ] as const;

  const client = [
    ["/client", "Главная", Home],
    ["/client/nutrition", "Питание", Utensils],
    ["/client/progress", "Прогресс", TrendingUp],
    ["/client/profile", "Профиль", UserRound],
  ] as const;

  const items = role === "admin" ? admin : client;

  return (
    <div className="app">
      <aside className="side">
        <Link href={role === "admin" ? "/admin" : "/client"} className="brand">
          <span>AI</span>
          <strong>Nutrition</strong>
        </Link>

        <nav className="desktopNav">
          {items.map(([href, label, Icon]) => (
            <Link href={href} key={href}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sideBottom">
          <form action="/api/auth/logout" method="post">
            <button className="sideLogout" type="submit">
              <LogOut size={18} strokeWidth={1.8} />
              Выйти
            </button>
          </form>
        </div>
      </aside>

      <header className="mobileTopbar">
        <Link href={role === "admin" ? "/admin" : "/client"} className="mobileBrand">
          <span>AI</span>
          <strong>Nutrition</strong>
        </Link>
        <form action="/api/auth/logout" method="post">
          <button className="mobileLogout" type="submit" aria-label="Выйти">
            <LogOut size={18} />
          </button>
        </form>
      </header>

      <main className="content">{children}</main>

      <nav className={"mobileNav " + (role === "admin" ? "adminMobileNav" : "")}>
        {items.map(([href, label, Icon]) => (
          <Link href={href} key={href}>
            <Icon size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
