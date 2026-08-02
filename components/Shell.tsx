import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import NavLinks, { type NavItem } from "@/components/NavLinks";
import MobileDrawer from "@/components/MobileDrawer";
import AdminCommandPalette from "@/components/AdminCommandPalette";
import { LogOut } from "lucide-react";

type NavGroup = { label: string; items: readonly NavItem[] };

const calmUiCss = String.raw`
.calmUi{
  --calm-bg:#0a0b0d;
  --calm-surface:#111216;
  --calm-surface-soft:#0e0f12;
  --calm-line:#24262b;
  --calm-line-strong:#303238;
  --calm-text:#f3f3ef;
  --calm-muted:#8a8d8a;
}
.calmUi.app{grid-template-columns:220px minmax(0,1fr);background:var(--calm-bg)}
.calmUi .side{padding:20px 13px;border-color:#202226;background:#0c0d0f;backdrop-filter:none}
.calmUi .brand{padding:5px 9px 22px;font-size:18px}
.calmUi .brand span{width:31px;height:31px;border-radius:9px;margin-right:8px;box-shadow:none}
.calmUi .navSection{gap:3px;margin-bottom:14px}
.calmUi .navSectionLabel{padding:0 11px 4px;color:#55585a;font-size:8px;letter-spacing:.12em}
.calmUi .desktopNav a{min-height:39px;padding:9px 11px;border-radius:9px;color:#969996;font-size:12px}
.calmUi .desktopNav a:hover{background:#14161a;color:#e8e8e4}
.calmUi .desktopNav a.active,
.calmUi .desktopNav a[aria-current="page"]{background:#171710;color:#ead484;box-shadow:inset 2px 0 0 #d3b35b}
.calmUi .sideLogout{min-height:40px;padding:9px 11px;border-radius:9px;font-size:12px}
.calmUi .content{max-width:1240px;padding:32px clamp(22px,3.2vw,42px) 54px}
.calmUi .pageHead{margin-bottom:20px;gap:16px}
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
.calmUi .sectionTitleRow>svg{opacity:.55}
.calmUi .muted{color:var(--calm-muted)!important}
.calmUi .textLink{font-size:11px;font-weight:650}
.calmUi .primary{background:#d8b85f;color:#111;border-radius:10px;box-shadow:none}
.calmUi .secondaryBtn{background:transparent;border-color:#303238;border-radius:10px;color:#b5b7b4}
.calmUi input,
.calmUi select,
.calmUi textarea{background:#0d0e11;border-color:#2a2c31;border-radius:10px}
.calmUi .dataFreshnessBar,
.calmUi .freshDataChip{background:transparent;border-color:#26282d;color:#737673}
.calmUi .planTeaser,
.calmUi .premiumProgressTeaser,
.calmUi .supportIntro>div{background:var(--calm-surface-soft);border-color:#26282d;box-shadow:none}
.calmUi .planTeaser{opacity:.82}
.calmUi .tableCard{background:var(--calm-surface-soft);border-color:var(--calm-line);box-shadow:none}
.calmUi .tableHead{background:#0c0d0f;color:#666966}
.calmUi .tableRow{border-color:#202227}
.calmUi .tableRow:hover{background:#121418}

.clientApp .clientWelcome{margin-bottom:14px}
.clientApp .clientWelcome h1{font-size:30px;letter-spacing:-.8px}
.clientApp .clientWelcome>div>span{font-size:11px;color:#858885}
.clientApp .clientDashboardHero{grid-template-columns:155px minmax(220px,1fr) minmax(230px,.8fr);gap:18px;padding:20px;border-color:#292b30;border-radius:16px;background:var(--calm-surface);box-shadow:none}
.clientApp .clientCalorieRing{width:138px;height:138px;background:conic-gradient(#d6b65d var(--progress),#22242a 0)}
.clientApp .clientCalorieRing:after{inset:10px;background:#0e0f12}
.clientApp .clientCalorieRing b{font-size:27px}
.clientApp .clientHeroCopy h2{font-size:19px;margin:4px 0 5px}
.clientApp .clientHeroCopy p{margin-bottom:12px}
.clientApp .clientHeroMacro{gap:9px}
.clientApp .heroMacroRow>i{height:4px}
.clientApp .clientQuickStats{display:flex;gap:0;margin-top:9px;overflow:auto;border:1px solid var(--calm-line);border-radius:13px;background:var(--calm-surface-soft)}
.clientApp .clientQuickStat{flex:1 0 170px;padding:11px 13px;border:0;border-right:1px solid #22242a;border-radius:0;background:transparent}
.clientApp .clientQuickStat:last-child{border-right:0}
.clientApp .clientQuickStat>i{width:29px;height:29px;border:1px solid #292c31;border-radius:9px;background:transparent;color:#c8ac5c}
.clientApp .clientQuickStat b{font-size:13px}
.clientApp .clientQuickStat small{font-size:8px}
.clientApp .clientQuickStat em{font-size:8px}
.clientApp .clientAttention{margin-top:9px;padding:12px 14px;border-radius:13px;background:var(--calm-surface);box-shadow:none}
.clientApp .clientAttention>i{width:34px;height:34px;border-radius:10px}
.clientApp .smartMealCard{margin-top:9px;padding:13px 14px;border-radius:13px;background:#12130f;border-color:#302d25}
.clientApp .smartMealIcon{width:36px;height:36px;border-radius:10px;background:#1c1a13}
.clientApp .smartMealBody h3{font-size:13px;margin:2px 0 6px}
.clientApp .clientHomeGrid{grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:10px}
.clientApp .clientMealPreview{padding:10px 0}
.clientApp .clientWeekStrip{background:var(--calm-surface-soft);border-color:#23252a}
.clientApp .clientWeekCards{gap:6px}
.clientApp .clientWeekCards a{padding:8px;border-color:#23252a;background:transparent}
.clientApp .clientWeekCards a.today{background:#15140f;box-shadow:none}
.clientApp .clientProfileHero{padding:15px;border-radius:14px;background:var(--calm-surface);border-color:var(--calm-line)}
.clientApp .profileForm.modern .formSection{background:var(--calm-surface-soft);border-color:#24262b;border-radius:12px}
.clientApp .progressHeroStats{display:flex;gap:0;overflow:auto;border:1px solid var(--calm-line);border-radius:13px;background:var(--calm-surface-soft)}
.clientApp .clientMetricCard{flex:1 0 190px;padding:12px 14px;border:0;border-right:1px solid #22242a;border-radius:0;background:transparent}
.clientApp .clientMetricCard:last-child{border-right:0}
.clientApp .clientMetricCard>i{width:31px;height:31px;border-radius:9px;background:transparent;border:1px solid #292c31}
.clientApp .clientProgressGrid{gap:10px}
.clientApp .progressChartCard,
.clientApp .weightProgressCard{background:var(--calm-surface)}
.clientApp .planCard{padding:18px;border-radius:14px;background:var(--calm-surface)}
.clientApp .planCard.premium{background:#14130f;border-color:#4b4127}
.clientApp .planFeatures{margin:15px 0;gap:7px}
.clientApp .premiumDifference>div,
.clientApp .premiumExamples article{background:var(--calm-surface-soft);border-color:#25272c}

.adminApp .adminToolbar{margin:-8px 0 12px}
.adminApp .adminKpis,
.adminApp .metricGrid{gap:8px}
.adminApp .adminKpi,
.adminApp .metricCard{padding:14px;border-radius:13px;background:var(--calm-surface);border-color:var(--calm-line);box-shadow:none}
.adminApp .adminKpi>i{width:34px;height:34px;border:1px solid #292c31;border-radius:10px;background:transparent}
.adminApp .adminKpi b{font-size:21px}
.adminApp .quickAdmin{gap:7px}
.adminApp .quickAdmin a{padding:11px;border-radius:11px;background:var(--calm-surface-soft);border-color:#24262b}
.adminApp .clientFilters{position:static;background:var(--calm-surface);backdrop-filter:none;box-shadow:none}
.adminApp .attentionCard,
.adminApp .aiObservations p,
.adminApp .profileFactV2,
.adminApp .foodCard{background:var(--calm-surface-soft);border-color:#24262b}
.adminApp .dialogsList{background:var(--calm-surface-soft)}
.adminApp .dialogPerson:hover{transform:none}
.adminApp .commandTrigger{background:transparent;border-color:#292c31}

@media(max-width:1050px){
  .calmUi.app{grid-template-columns:205px minmax(0,1fr)}
  .calmUi .content{padding-left:24px;padding-right:24px}
  .clientApp .clientDashboardHero{grid-template-columns:140px 1fr}
  .clientApp .clientHeroMacro{grid-column:1/3;grid-template-columns:repeat(3,1fr)}
  .clientApp .clientHomeGrid{grid-template-columns:1fr}
}
@media(max-width:900px){
  .calmUi.app{display:block;padding-top:62px}
  .calmUi .content{max-width:760px;padding:18px 14px 34px}
  .calmUi .mobileTopbar{height:62px;background:rgba(10,11,13,.96);border-color:#202226;backdrop-filter:blur(16px)}
  .calmUi .mobileDrawer{background:#0c0d0f;border-color:#24262b}
  .calmUi .mobileDrawerNav a{min-height:43px;border-radius:10px;font-size:12px}
  .calmUi .pageHead{margin-bottom:16px}
  .calmUi .pageHead h1{font-size:27px}
  .calmUi .card{padding:15px;border-radius:13px}
  .calmUi .sectionTitleRow .muted{display:none}
  .clientApp .clientDashboardHero{grid-template-columns:120px 1fr;gap:14px;padding:16px}
  .clientApp .clientCalorieRing{width:112px;height:112px}
  .clientApp .clientCalorieRing b{font-size:23px}
  .clientApp .clientHeroCopy{text-align:left}
  .clientApp .clientHeroActions{justify-content:flex-start}
  .clientApp .clientHeroMacro{grid-column:1/3;grid-template-columns:repeat(3,1fr);margin-top:4px}
  .clientApp .clientQuickStats,
  .clientApp .progressHeroStats{display:grid;grid-template-columns:1fr 1fr;overflow:visible}
  .clientApp .clientQuickStat,
  .clientApp .clientMetricCard{min-width:0;border-right:0;border-bottom:1px solid #22242a}
  .clientApp .clientQuickStat:nth-child(odd),
  .clientApp .clientMetricCard:nth-child(odd){border-right:1px solid #22242a}
  .clientApp .clientQuickStat:nth-last-child(-n+2),
  .clientApp .clientMetricCard:nth-last-child(-n+2){border-bottom:0}
  .clientApp .clientQuickStat em,
  .clientApp .clientMetricCard em{display:none}
  .clientApp .clientHomeGrid{display:grid}
  .adminApp .adminKpis,
  .adminApp .metricGrid{grid-template-columns:1fr 1fr}
}
@media(max-width:520px){
  .calmUi .content{padding-left:10px;padding-right:10px}
  .clientApp .clientWelcome h1{font-size:25px}
  .clientApp .clientDashboardHero{display:block;padding:15px}
  .clientApp .clientCalorieRing{margin:0 auto 14px}
  .clientApp .clientHeroCopy{text-align:center}
  .clientApp .clientHeroActions{justify-content:center}
  .clientApp .clientHeroMacro{display:grid;grid-template-columns:1fr;margin-top:16px;text-align:left}
  .clientApp .clientQuickStats,
  .clientApp .progressHeroStats{grid-template-columns:1fr}
  .clientApp .clientQuickStat,
  .clientApp .clientMetricCard{border-right:0!important;border-bottom:1px solid #22242a!important}
  .clientApp .clientQuickStat:last-child,
  .clientApp .clientMetricCard:last-child{border-bottom:0!important}
  .clientApp .smartMealCard{grid-template-columns:auto 1fr}
  .clientApp .smartMealCard>a{grid-column:2}
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
      label: "Главное",
      items: [
        ["/admin", "Главная", "home"],
        ["/admin/dialogs", "Диалоги", "dialogs"],
        ["/admin/clients", "Клиенты", "clients"],
        ["/admin/activity", "Активность", "activity"],
      ],
    },
    {
      label: "Аналитика",
      items: [
        ["/admin/analytics", "Аналитика", "analytics"],
        ["/admin/n8n", "n8n", "n8n"],
        ["/admin/premium-health", "Premium", "activity"],
      ],
    },
    {
      label: "Управление",
      items: [
        ["/admin/catalog", "Продукты", "catalog"],
        ["/admin/knowledge", "База знаний", "catalog"],
        ["/admin/mailings", "Рассылки", "mailings"],
        ["/admin/subscriptions", "Подписки", "subscriptions"],
        ["/admin/replay", "Повтор обработки", "activity"],
        ["/admin/system", "Система", "settings"],
      ],
    },
  ];

  const clientGroups: readonly NavGroup[] = [
    {
      label: "Основное",
      items: [
        ["/client", "Главная", "home"],
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
      <main className="content">
        {role === "admin" && (
          <div className="adminToolbar">
            <AdminCommandPalette />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
