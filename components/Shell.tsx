import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import NavLinks, { type NavItem } from "@/components/NavLinks";
import MobileDrawer from "@/components/MobileDrawer";
import ClientBottomNav from "@/components/ClientBottomNav";
import { LogOut } from "lucide-react";

type NavGroup = { label: string; items: readonly NavItem[] };

const calmUiCss = String.raw`
.calmUi{
  --calm-bg:var(--bg);
  --calm-surface:var(--surface);
  --calm-surface-soft:var(--surface-soft);
  --calm-line:var(--line);
  --calm-text:var(--text);
  --calm-muted:var(--muted);
}
.calmUi.app{grid-template-columns:208px minmax(0,1fr);background:var(--calm-bg)}
.calmUi .side{padding:20px 12px;border-color:var(--line);background:var(--panel);backdrop-filter:none}
.calmUi .brand{padding:5px 9px 24px;font-size:18px}
.calmUi .brand span{width:31px;height:31px;border-radius:9px;margin-right:8px;box-shadow:none}
.calmUi .desktopNav{flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}
.calmUi .desktopNav::-webkit-scrollbar{width:5px}
.calmUi .desktopNav::-webkit-scrollbar-thumb{background:var(--panel2);border-radius:99px}
.calmUi .sideBottom{padding-top:10px;border-top:1px solid var(--line)}
.calmUi .navSection{gap:3px;margin-bottom:12px}
.calmUi .navSectionLabel{padding:0 11px 5px;color:var(--muted2);font-size:12.5px;letter-spacing:.12em}
.calmUi .desktopNav a{min-height:41px;padding:10px 11px;border-radius:10px;color:var(--muted);font-size:13px}
.calmUi .desktopNav a:hover{background:var(--surface-soft);color:var(--text)}
.calmUi .desktopNav a.active,
.calmUi .desktopNav a[aria-current="page"]{background:var(--accent-soft);color:var(--gold);box-shadow:inset 2px 0 0 var(--gold)}
.calmUi .sideLogout{min-height:40px;padding:9px 11px;border-radius:9px;font-size:13px}
.calmUi .content{max-width:1180px;padding:32px clamp(22px,3.2vw,42px) 64px}
.calmUi .pageHead{margin-bottom:19px;gap:16px}
.calmUi .pageHead>div{max-width:720px}
.calmUi .pageHead p{margin-bottom:6px;font-size:12.5px;letter-spacing:.12em}
.calmUi .pageHead h1{font-size:clamp(28px,2.7vw,36px);line-height:1.04;letter-spacing:-1px;margin-bottom:6px}
.calmUi .pageHead span{max-width:670px;color:var(--muted);font-size:13px;line-height:1.48}
.calmUi .card,
.calmUi .stat,
.calmUi .clientTodayHero,
.calmUi .clientMacroCard,
.calmUi .progressSummaryCard{background:var(--calm-surface);border-color:var(--calm-line);border-radius:14px;box-shadow:none}
.calmUi .card{padding:18px}
.calmUi .card h2{font-size:15px;margin-bottom:13px}
.calmUi .top{margin-top:11px}
.calmUi .sectionTitleRow{gap:12px}
.calmUi .sectionTitleRow .muted{font-size:13px;color:var(--muted2)!important}
.calmUi .sectionTitleRow>svg{opacity:.5;color:var(--muted2)}
.calmUi .muted{color:var(--calm-muted)!important}
.calmUi .textLink{font-size:12.5px;font-weight:650;color:var(--muted)}
.calmUi .primary{background:var(--gold-btn);color:var(--on-gold);border-radius:10px;box-shadow:none}
.calmUi .secondaryBtn{background:transparent;border-color:var(--line);border-radius:10px;color:var(--muted)}
.calmUi input,
.calmUi select,
.calmUi textarea{background:var(--bg);border-color:var(--line);border-radius:10px}
.calmUi .tableCard{background:var(--calm-surface-soft);border-color:var(--calm-line);box-shadow:none}
.calmUi .tableHead{background:var(--bg);color:var(--muted2)}
.calmUi .tableRow{border-color:var(--line)}
.calmUi .tableRow:hover{background:var(--surface-soft)}

.clientApp .clientWelcome{margin-bottom:14px}
.clientApp .clientWelcome h1{font-size:30px;letter-spacing:-.8px}
.clientApp .clientWelcome>div>span{font-size:12.5px;color:var(--muted2)}
.clientApp .clientProfileHero{padding:15px;border-radius:14px;background:var(--calm-surface);border-color:var(--calm-line)}
.clientApp .profileForm.modern .formSection{background:var(--calm-surface-soft);border-color:var(--line);border-radius:12px}
.clientApp .planCard{padding:18px;border-radius:14px;background:var(--calm-surface)}
.clientApp .planCard.premium{background:var(--bg);border-color:var(--gold2)}
.clientApp .planFeatures{margin:15px 0;gap:7px}
.clientApp .premiumDifference>div,
.clientApp .premiumExamples article{background:var(--calm-surface-soft);border-color:var(--line)}

.adminApp .adminKpis,
.adminApp .metricGrid{gap:8px}
.adminApp .adminKpi,
.adminApp .metricCard{padding:14px;border-radius:13px;background:var(--calm-surface);border-color:var(--calm-line);box-shadow:none}
.adminApp .adminKpi>i{width:34px;height:34px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--muted)}
.adminApp .adminKpi b{font-size:21px}
.adminApp .attentionCard,
.adminApp .profileFactV2,
.adminApp .foodCard{background:var(--calm-surface-soft);border-color:var(--line)}
.adminApp .dialogsList{background:var(--calm-surface-soft)}
.adminApp .dialogPerson:hover{transform:none}

@media(max-width:1050px){
  .calmUi.app{grid-template-columns:196px minmax(0,1fr)}
  .calmUi .content{padding-left:24px;padding-right:24px}
}
@media(max-width:900px){
  .calmUi.app{display:block;padding-top:62px}
  .clientApp.calmUi.app{padding-bottom:76px}
  .calmUi .content{max-width:760px;padding:18px 14px 38px}
  .clientApp .content{padding-bottom:84px}
  .calmUi .mobileTopbar{height:62px;background:var(--nav);border-color:var(--line);backdrop-filter:blur(16px)}
  .calmUi .mobileDrawer{background:var(--panel);border-color:var(--line)}
  .calmUi .mobileDrawerNav a{min-height:43px;border-radius:10px;font-size:13px}
  .calmUi .pageHead{margin-bottom:16px}
  .calmUi .pageHead h1{font-size:27px}
  .calmUi .card{padding:15px;border-radius:13px}
  .calmUi .sectionTitleRow .muted{display:none}
  .adminApp .adminKpis,
  .adminApp .metricGrid{grid-template-columns:1fr 1fr}
}
@media(max-width:520px){
  .calmUi .content{padding-left:10px;padding-right:10px}
  .clientApp .clientWelcome h1{font-size:25px}
  .adminApp .adminKpis,
  .adminApp .metricGrid{grid-template-columns:1fr}
}
`;

export default async function Shell({
  children,
  role,
  isPremium = false,
}: {
  children: React.ReactNode;
  role: "admin" | "client";
  isPremium?: boolean;
}) {
  const adminGroups: readonly NavGroup[] = [
    {
      label: "Каждый день",
      items: [
        ["/admin", "Сегодня", "home"],
        ["/admin/dialogs", "Диалоги", "dialogs"],
        ["/admin/clients", "Клиенты", "clients"],
        ["/admin/activity", "Активность", "activity"],
      ],
    },
    {
      label: "Аналитика",
      items: [
        ["/admin/analytics", "Аналитика", "analytics"],
        ["/admin/premium-health", "Premium", "plan"],
      ],
    },
    {
      label: "Ведение базы",
      items: [
        ["/admin/catalog", "Продукты", "catalog"],
        ["/admin/knowledge", "База знаний", "coach"],
        ["/admin/mailings", "Рассылки", "mailings"],
        ["/admin/subscriptions", "Подписки", "subscriptions"],
      ],
    },
    {
      label: "Служебное",
      items: [
        ["/admin/system", "Система", "settings"],
        ["/admin/n8n", "n8n", "n8n"],
        ["/admin/replay", "Повтор обработки", "history"],
      ],
    },
  ];

  const clientGroups: readonly NavGroup[] = [
    {
      label: "Основное",
      items: [
        ["/client", "Сегодня", "home"],
        ["/client/nutrition", "Питание", "nutrition"],
        ["/client/progress", "Прогресс", "progress"],
        ["/client/coach", "TeddY Coach", "coach", { premium: true }],
      ],
    },
    {
      label: "Ещё",
      items: [
        ["/client/history", "История", "history"],
        ["/client/profile", "Профиль", "profile"],
        ["/client/plan", "Подписка", "plan"],
        ["/client/support", "Поддержка", "support"],
      ],
    },
  ];

  let unreadDialogs = 0;
  if (role === "admin") {
    const supabase = getSupabaseAdmin();
    const { count } = await supabase
      .from("support_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender", "client")
      .is("read_by_admin_at", null);
    unreadDialogs = count || 0;
  }

  const groups = role === "admin" ? adminGroups : clientGroups;

  return (
    <div className={`app calmUi ${role}App`}>
      <style>{calmUiCss}</style>
      <aside className="side">
        <Link href={role === "admin" ? "/admin" : "/client"} className="brand">
          <span>AI</span>
          <strong>TeddY</strong>
        </Link>
        <nav className="desktopNav">
          {groups.map((group) => (
            <section className="navSection" key={group.label}>
              <span className="navSectionLabel">{group.label}</span>
              <NavLinks items={group.items} unreadDialogs={unreadDialogs} isPremium={isPremium} />
            </section>
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

      <MobileDrawer
        role={role}
        groups={groups}
        unreadDialogs={unreadDialogs}
        isPremium={isPremium}
      />

      <main className="content">{children}</main>
      {role === "client" ? <ClientBottomNav /> : null}
    </div>
  );
}
