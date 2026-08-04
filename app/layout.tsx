import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TeddY", template: "%s · TeddY" },
  description: "Личный AI-диетолог: питание, КБЖУ, прогресс и поддержка.",
  applicationName: "TeddY",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "TeddY",
    description: "Личный AI-диетолог: питание, КБЖУ, прогресс и поддержка.",
    type: "website",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "TeddY",
    description: "Личный AI-диетолог: питание, КБЖУ, прогресс и поддержка.",
    images: ["/opengraph-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef3f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1716" },
  ],
};

const themeBoot = `
(() => {
  try {
    const saved = localStorage.getItem('teddy-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved === 'light' || saved === 'dark' ? saved : (systemDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = 'dark';
  }
})();`;

const themeControls = `
(() => {
  const mount = () => {
    if (document.getElementById('teddy-theme-toggle')) return;
    const button = document.createElement('button');
    button.id = 'teddy-theme-toggle';
    button.type = 'button';
    button.setAttribute('aria-label', 'Переключить тему');
    const render = () => {
      const dark = document.documentElement.dataset.theme === 'dark';
      button.textContent = dark ? '☀' : '☾';
      button.title = dark ? 'Включить светлую тему' : 'Включить тёмную тему';
      button.setAttribute('aria-pressed', String(!dark));
    };
    button.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
      localStorage.setItem('teddy-theme', next);
      render();
    });
    document.body.appendChild(button);
    render();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();`;

const themeCss = `
:root[data-theme="dark"]{
  --bg:#0d1716;--panel:#121d1c;--panel2:#172321;--line:#263633;--line2:#344945;
  --text:#f3f7f5;--muted:#9aa9a5;--muted2:#6f817c;--gold:#e7c96b;--gold2:#c7a94f;
  --green:#60c7a4;--red:#df8585;--shadow:0 18px 48px rgba(0,0,0,.28);
  --surface:#121d1c;--surface-raised:#172321;--surface-soft:#1b2927;--nav-bg:rgba(14,23,22,.9);
}
:root[data-theme="light"]{
  --bg:#eef3f0;--panel:#f9f8f3;--panel2:#f2f6f3;--line:#d9e1dc;--line2:#c7d2cc;
  --text:#17322e;--muted:#647872;--muted2:#879792;--gold:#9c7623;--gold2:#7e5e18;
  --green:#16866d;--red:#b95757;--shadow:0 14px 36px rgba(31,58,51,.09);
  --surface:#f9f8f3;--surface-raised:#ffffff;--surface-soft:#f0f4f1;--nav-bg:rgba(250,250,247,.91);
}
*{scrollbar-color:var(--line2) transparent}
html,body{transition:background-color .2s ease,color .2s ease}
body{background:var(--bg)!important;color:var(--text)!important}
:root[data-theme="dark"] body{background:radial-gradient(800px 420px at 50% -180px,rgba(48,139,116,.11),transparent 62%),var(--bg)!important}
:root[data-theme="light"] body{background:radial-gradient(800px 420px at 50% -180px,rgba(61,143,122,.08),transparent 62%),var(--bg)!important}

.side,.mobileTopbar,.mobileNav{background:var(--nav-bg)!important;border-color:var(--line)!important;backdrop-filter:blur(24px) saturate(140%)!important}
.mobileTopbar{box-shadow:0 1px 0 var(--line),0 8px 28px rgba(0,0,0,.04)!important}
.brand span,.mobileBrand span{background:linear-gradient(145deg,#f2d987,#d2af50)!important;color:#17201d!important;box-shadow:none!important}
.brand strong,.mobileBrand strong{letter-spacing:-.45px}
.desktopNav a,.sideLogout{color:var(--muted)!important}
.desktopNav a:hover,.sideLogout:hover{background:var(--surface-soft)!important;color:var(--text)!important}

.card,.stat,.heroKcal,.clientTodayHero,.progressSummaryCard,.clientMacroCard,.conversation,.dialogsList,.planCard,.subscriptionCard,.todayNutritionCard,.clientDashboardHero,.clientActionCard,.clientInsightCard,.clientWeeklyCard,.clientCoachCard,.clientImportantCard,.premiumPlanHero,.premiumLockHero,.strategyProposal,.currentPlanStrip,.planTeaser,.attentionCard,.visualMealSession,.formSection,.miniStat,.clientFact{
  background:var(--surface)!important;border:1px solid var(--line)!important;box-shadow:var(--shadow)!important;border-radius:20px!important;
}
:root[data-theme="light"] .card,:root[data-theme="light"] .stat,:root[data-theme="light"] .heroKcal,:root[data-theme="light"] .clientTodayHero,:root[data-theme="light"] .progressSummaryCard,:root[data-theme="light"] .clientMacroCard,:root[data-theme="light"] .conversation,:root[data-theme="light"] .dialogsList,:root[data-theme="light"] .planCard,:root[data-theme="light"] .subscriptionCard,:root[data-theme="light"] .todayNutritionCard,:root[data-theme="light"] .clientDashboardHero,:root[data-theme="light"] .clientActionCard,:root[data-theme="light"] .clientInsightCard,:root[data-theme="light"] .clientWeeklyCard,:root[data-theme="light"] .clientCoachCard,:root[data-theme="light"] .clientImportantCard{background:var(--surface-raised)!important}
.card{padding:22px!important}
.card+.card{margin-top:14px}
.pageHead,.clientWelcome{margin-bottom:22px!important}
.pageHead h1,.clientWelcome h1{letter-spacing:-1.15px!important;color:var(--text)!important}
.pageHead p,.clientWelcome p{color:var(--green)!important}

input,select,textarea{background:var(--surface-raised)!important;color:var(--text)!important;border-color:var(--line2)!important;box-shadow:none!important}
input:focus,select:focus,textarea:focus{border-color:var(--green)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--green) 14%,transparent)!important}
.tableHead,.conversationHead{background:var(--surface-soft)!important;border-color:var(--line)!important;color:var(--muted)!important}
.tableRow,.row,.meal,.health,.dialogPerson,.messageBubble,.visualMealItem,.recentClient{border-color:var(--line)!important}
.tableRow:hover,.dialogPerson:hover,.dialogPerson.active{background:var(--surface-soft)!important}
.messageBubble,.chat{background:var(--surface-soft)!important;border-color:var(--line)!important}
.messageBubble.assistant,.chat.assistant{background:color-mix(in srgb,var(--green) 9%,var(--surface))!important;border-color:color-mix(in srgb,var(--green) 28%,var(--line))!important}
.messageBubble p,.digest,.premiumLongText{color:var(--text)!important}

.primary{background:linear-gradient(135deg,#edd173,#d8b54c)!important;color:#19201d!important;border:0!important;box-shadow:0 9px 22px rgba(188,151,52,.18)!important;border-radius:13px!important}
.secondaryBtn,.commandTrigger{background:var(--surface-raised)!important;color:var(--text)!important;border-color:var(--line2)!important}
.progress,.goalProgress,.macroProgress,.macroRow>i,.heroMacroRow>i,.stackedBar{background:var(--line)!important}
.progress i,.goalProgress i,.macroProgress i,.heroMacroRow em{background:linear-gradient(90deg,var(--green),#8bd5bd)!important}

.clientDashboardHero{background:var(--surface)!important;box-shadow:none!important}
.clientCalorieRing:after,.kcalRing:after{background:var(--surface)!important}
.clientCalorieRing{background:conic-gradient(var(--gold) var(--progress),var(--line) 0)!important}
.clientActionCard,.clientInsightCard,.clientWeeklyCard,.clientCoachCard,.clientImportantCard{overflow:hidden}
.clientWeeklyCard,.clientImportantCard,.clientCoachCard{background:var(--surface)!important}
.weekBar.empty{background:var(--line)!important}
.weekCol small,.weekCol em,.trendMeta{color:var(--muted)!important}

#teddy-theme-toggle{position:fixed;top:max(13px,env(safe-area-inset-top));right:16px;z-index:9999;width:42px;height:42px;border:1px solid var(--line2);border-radius:14px;background:var(--surface-raised);color:var(--gold);display:grid;place-items:center;font-size:23px;font-weight:500;line-height:1;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.12);transition:transform .15s ease,background .2s ease,border-color .2s ease}
#teddy-theme-toggle:hover{transform:translateY(-1px)}
#teddy-theme-toggle:active{transform:scale(.96)}

@media(max-width:900px){
  .content{padding:24px 15px calc(104px + env(safe-area-inset-bottom))!important}
  .mobileTopbar{min-height:72px!important;padding:10px 16px!important}
  .mobileBrand{margin:auto!important}
  .mobileBrand span{width:40px!important;height:40px!important;border-radius:12px!important}
  .mobileBrand strong{font-size:18px!important}
  #teddy-theme-toggle{top:max(14px,env(safe-area-inset-top));right:16px;width:42px;height:42px;border-radius:14px;font-size:22px}
  .mobileMenuButton{width:42px!important;height:42px!important;border-radius:14px!important;background:var(--surface-raised)!important;border-color:var(--line2)!important;box-shadow:0 8px 24px rgba(0,0,0,.08)!important}
  .clientWelcome{margin:6px 0 22px!important}
  .clientWelcome h1{font-size:30px!important;line-height:1.08!important}
  .clientWelcome>div>span{font-size:14px!important;margin-top:8px!important}
  .clientDashboardHero{display:grid!important;grid-template-columns:1fr!important;gap:22px!important;padding:22px!important;border-radius:22px!important}
  .clientCalorieRing{width:152px!important;height:152px!important;margin:auto!important}
  .clientHeroCopy{text-align:center!important}
  .clientHeroActions{justify-content:center!important}
  .clientHeroMacro{margin-top:2px!important}
  .clientQuickStats{grid-template-columns:repeat(2,1fr)!important;gap:10px!important}
  .clientQuickStat{min-height:74px!important;padding:14px!important;background:var(--surface)!important;border-color:var(--line)!important;border-radius:16px!important}
  .card{padding:20px!important;border-radius:20px!important}
  .todayNutritionCard{grid-template-columns:1fr!important;padding:20px!important;gap:20px!important}
  .weekChart{gap:7px!important}
  .weekCol{min-width:0!important}
  .weekBarTrack{border-radius:9px!important;overflow:hidden!important}
  .clientCoachCard,.clientImportantCard,.clientWeeklyCard{margin-top:14px!important}
  .clientBottomNav{left:12px!important;right:12px!important;bottom:max(10px,env(safe-area-inset-bottom))!important;min-height:68px!important;padding:7px 6px!important;border:1px solid color-mix(in srgb,var(--line2) 75%,transparent)!important;border-radius:22px!important;background:color-mix(in srgb,var(--nav-bg) 94%,transparent)!important;box-shadow:0 18px 44px rgba(0,0,0,.22)!important;backdrop-filter:blur(24px) saturate(150%)!important}
  .clientBottomNav a{gap:4px!important;border-radius:16px!important;color:var(--muted)!important;font-size:11.5px!important;font-weight:720!important;transition:.18s ease!important}
  .clientBottomNav a svg{width:21px!important;height:21px!important}
  .clientBottomNav a.active{background:color-mix(in srgb,var(--gold) 13%,var(--surface))!important;color:var(--gold)!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--gold) 18%,transparent)!important}
  .clientBottomNav a:active{transform:scale(.95)}
}

@media(max-width:430px){
  .content{padding-left:14px!important;padding-right:14px!important}
  .card{padding:18px!important}
  .clientBottomNav{left:10px!important;right:10px!important}
  .clientBottomNav a{font-size:10.5px!important}
}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: themeControls }} />
      </body>
    </html>
  );
}
