import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import NavLinks, { type NavItem } from "@/components/NavLinks";
import MobileDrawer from "@/components/MobileDrawer";
import ClientBottomNav from "@/components/ClientBottomNav";
import { LogOut } from "lucide-react";

type NavGroup = { label: string; items: readonly NavItem[] };

const calmUiCss = String.raw`
.calmUi{
  --calm-bg:#0a0b0d;
  --calm-surface:#111216;
  --calm-surface-soft:#0e0f12;
  --calm-line:#24262b;
  --calm-text:#f3f3ef;
  --calm-muted:#858885;
}
.calmUi.app{grid-template-columns:208px minmax(0,1fr);background:var(--calm-bg)}
.calmUi .side{padding:20px 12px;border-color:#202226;background:#0c0d0f;backdrop-filter:none}
.calmUi .brand{padding:5px 9px 24px;font-size:18px}
.calmUi .brand span{width:31px;height:31px;border-radius:9px;margin-right:8px;box-shadow:none}
.calmUi .desktopNav{flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#26282d transparent}
.calmUi .desktopNav::-webkit-scrollbar{width:5px}
.calmUi .desktopNav::-webkit-scrollbar-thumb{background:#26282d;border-radius:99px}
.calmUi .sideBottom{padding-top:10px;border-top:1px solid #1c1e22}
.calmUi .navSection{gap:3px;margin-bottom:12px}
.calmUi .navSectionLabel{padding:0 11px 5px;color:#55585a;font-size:8px;letter-spacing:.12em}
.calmUi .desktopNav a{min-height:41px;padding:10px 11px;border-radius:10px;color:#9a9d99;font-size:12px}
.calmUi .desktopNav a:hover{background:#14161a;color:#e8e8e4}
.calmUi .desktopNav a.active,
.calmUi .desktopNav a[aria-current="page"]{background:#171710;color:#ead484;box-shadow:inset 2px 0 0 #d3b35b}
.calmUi .sideLogout{min-height:40px;padding:9px 11px;border-radius:9px;font-size:12px}
.calmUi .content{max-width:1180px;padding:32px clamp(22px,3.2vw,42px) 64px}
.calmUi .pageHead{margin-bottom:19px;gap:16px}
.calmUi .pageHead>div{max-width:720px}
.calmUi .pageHead p{margin-bottom:6px;font-size:8px;letter-spacing:.12em}
.calmUi .pageHead h1{font-size:clamp(28px,2.7vw,36px);line-height:1.04;letter-spacing:-1px;margin-bottom:6px}
.calmUi .pageHead span{max-width:670px;color:#949793;font-size:12px;line-height:1.48}
.calmUi .card,
.calmUi .stat,
.calmUi .clientTodayHero,
.calmUi .clientMacroCard,
.calmUi .progressSummaryCard{background:var(--calm-surface);border-color:var(--calm-line);border-radius:14px;box-shadow:none}
.calmUi .card{padding:18px}
.calmUi .card h2{font-size:15px;margin-bottom:13px}
.calmUi .top{margin-top:11px}
.calmUi .sectionTitleRow{gap:12px}
.calmUi .sectionTitleRow .muted{font-size:10px;color:#777a77!important}
.calmUi .sectionTitleRow>svg{opacity:.5;color:#8a8d89}
.calmUi .muted{color:var(--calm-muted)!important}
.calmUi .textLink{font-size:11px;font-weight:650;color:#b8bab6}
.calmUi .primary{background:#d8b85f;color:#111;border-radius:10px;box-shadow:none}
.calmUi .secondaryBtn{background:transparent;border-color:#303238;border-radius:10px;color:#b5b7b4}
.calmUi input,
.calmUi select,
.calmUi textarea{background:#0d0e11;border-color:#2a2c31;border-radius:10px}
.calmUi .tableCard{background:var(--calm-surface-soft);border-color:var(--calm-line);box-shadow:none}
.calmUi .tableHead{background:#0c0d0f;color:#666966}
.calmUi .tableRow{border-color:#202227}
.calmUi .tableRow:hover{background:#121418}

.clientApp .clientWelcome{margin-bottom:14px}
.clientApp .clientWelcome h1{font-size:30px;letter-spacing:-.8px}
.clientApp .clientWelcome>div>span{font-size:11px;color:#858885}
.clientApp .clientProfileHero{padding:15px;border-radius:14px;background:var(--calm-surface);border-color:var(--calm-line)}
.clientApp .profileForm.modern .formSection{background:var(--calm-surface-soft);border-color:#24262b;border-radius:12px}
.clientApp .planCard{padding:18px;border-radius:14px;background:var(--calm-surface)}
.clientApp .planCard.premium{background:#14130f;border-color:#4b4127}
.clientApp .planFeatures{margin:15px 0;gap:7px}
.clientApp .premiumDifference>div,
.clientApp .premiumExamples article{background:var(--calm-surface-soft);border-color:#25272c}

.adminApp .adminKpis,
.adminApp .metricGrid{gap:8px}
.adminApp .adminKpi,
.adminApp .metricCard{padding:14px;border-radius:13px;background:var(--calm-surface);border-color:var(--calm-line);box-shadow:none}
.adminApp .adminKpi>i{width:34px;height:34px;border:1px solid #292c31;border-radius:10px;background:transparent;color:#8f928e}
.adminApp .adminKpi b{font-size:21px}
.adminApp .attentionCard,
.adminApp .profileFactV2,
.adminApp .foodCard{background:var(--calm-surface-soft);border-color:#24262b}
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
  .calmUi .mobileTopbar{height:62px;background:rgba(10,11,13,.96);border-color:#202226;backdrop-filter:blur(16px)}
  .calmUi .mobileDrawer{background:#0c0d0f;border-color:#24262b}
  .calmUi .mobileDrawerNav a{min-height:43px;border-radius:10px;font-size:12px}
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
