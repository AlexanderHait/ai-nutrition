import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Boxes,
  Crown,
  CreditCard,
  RefreshCw,
  Send,
  Settings,
  Workflow,
} from "lucide-react";
import SimplifiedSections from "@/components/SimplifiedSections";

export const dynamic = "force-dynamic";

const groups = [
  {
    title: "Аналитика",
    links: [
      { href: "/admin/analytics", title: "Аналитика", text: "Воронка, активность и бизнес-показатели", icon: <BarChart3 size={15} /> },
      { href: "/admin/premium-health", title: "Premium", text: "Контроль сопровождения клиентов", icon: <Crown size={15} /> },
      { href: "/admin/n8n", title: "n8n", text: "Состояние рабочих процессов", icon: <Workflow size={15} /> },
    ],
  },
  {
    title: "Контент",
    links: [
      { href: "/admin/catalog", title: "Продукты", text: "Каталог и эталонные КБЖУ", icon: <Boxes size={15} /> },
      { href: "/admin/knowledge", title: "База знаний", text: "Материалы и правила TeddY", icon: <BookOpen size={15} /> },
      { href: "/admin/mailings", title: "Рассылки", text: "Сообщения клиентам", icon: <Send size={15} /> },
    ],
  },
  {
    title: "Управление",
    links: [
      { href: "/admin/subscriptions", title: "Подписки", text: "Basic, Premium и сроки доступа", icon: <CreditCard size={15} /> },
      { href: "/admin/replay", title: "Повтор обработки", text: "Безопасный повтор неудачных запросов", icon: <RefreshCw size={15} /> },
      { href: "/admin/system", title: "Система", text: "Ошибки, здоровье и технический контроль", icon: <Settings size={15} /> },
    ],
  },
];

export default function Page() {
  return (
    <>
      <SimplifiedSections />
      <div className="pageHead">
        <div>
          <p>Админка</p>
          <h1>Все разделы</h1>
          <span>Редкие инструменты собраны отдельно и не перегружают основную навигацию.</span>
        </div>
        <Link className="secondaryBtn" href="/admin">← На главную</Link>
      </div>

      <div className="adminToolsGrid">
        {groups.map((group) => (
          <section className="card adminToolGroup" key={group.title}>
            <h2>{group.title}</h2>
            <div className="adminToolLinks">
              {group.links.map((item) => (
                <Link className="adminToolLink" href={item.href} key={item.href}>
                  <i>{item.icon}</i>
                  <span><b>{item.title}</b><small>{item.text}</small></span>
                  <em>→</em>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
