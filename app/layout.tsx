import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: {
    default: "TeddY",
    template: "%s · TeddY",
  },
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
    { media: "(prefers-color-scheme: light)", color: "#f2f5f2" },
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

const themeCss = `
:root[data-theme="dark"]{
  --bg:#0d1716;
  --panel:#131f1e;
  --panel2:#172624;
  --surface:#182825;
  --surface-soft:#111c1b;
  --line:#263936;
  --line2:#334a46;
  --text:#f1f5f3;
  --muted:#98a8a3;
  --muted2:#6f817c;
  --gold:#d9bd68;
  --gold2:#b99442;
  --green:#8abd9c;
  --red:#df8585;
  --shadow:0 18px 46px rgba(2,12,11,.28);
  --nav:rgba(15,25,24,.94);
  --accent-soft:#20261e;
  --acc-prot:#6aa9e0;
  --acc-fat:#e0a86a;
  --acc-carb:#91c2a0;
  --acc-good:#82b899;
  --acc-warn:#d8a05c;
  --acc-bad:#cf7a6b;
  --acc-info:#5cb0c4;
  --tier-free:#8a9099;
  --tier-basic:#5cb0c4;
  --tier-premium:#d8b85f;
  --tier-premium-2:#a08ad0;
}
:root[data-theme="light"]{
  --bg:#f2f5f2;
  --panel:#ffffff;
  --panel2:#f7f8f5;
  --surface:#ffffff;
  --surface-soft:#f4f6f3;
  --line:#dde4df;
  --line2:#cbd6cf;
  --text:#19342f;
  --muted:#5c6d68;
  --muted2:#78877f;
  --gold:#a97e21;
  --gold2:#805d13;
  --green:#487d5f;
  --red:#b95353;
  --shadow:0 12px 32px rgba(38,61,54,.08);
  --nav:rgba(250,251,248,.95);
  --accent-soft:#f5efe0;
  --acc-prot:#2f6fa8;
  --acc-fat:#a5702c;
  --acc-carb:#4c805f;
  --acc-good:#467d60;
  --acc-warn:#a5702c;
  --acc-bad:#b34a3a;
  --acc-info:#2b7f93;
  --tier-free:#5f6b73;
  --tier-basic:#2b7f93;
  --tier-premium:#a97e21;
  --tier-premium-2:#6d55a3;
}
.card,.stat,.tableRow,.dialogPerson,.messageBubble,.chat,.side,.mobileTopbar,.mobileDrawer,.clientBottomNav,.themeToggle,input,select,textarea,button,a{transition-property:background-color,border-color,color,box-shadow;transition-duration:.16s;transition-timing-function:ease}
@media (prefers-reduced-motion:reduce){*{transition-duration:0s!important;animation-duration:0s!important}}
html,body{background:var(--bg)!important;color:var(--text)!important}
body{background-image:none!important}
.calmUi.app{background:var(--bg)!important;color:var(--text)!important}
.calmUi .brand strong,.calmUi .mobileBrand strong{font-size:18px!important;font-weight:800;letter-spacing:-.35px}
.calmUi .brand span,.calmUi .mobileBrand span{background:linear-gradient(145deg,#e8cd78,#cda749)!important;color:#17201e!important;box-shadow:none!important}
.calmUi .desktopNav a.active,.calmUi .desktopNav a[aria-current="page"]{background:var(--accent-soft)!important;color:var(--gold2)!important;box-shadow:none!important}

.card,.stat,.heroKcal,.clientTodayHero,.clientMacroCard,.progressSummaryCard,.clientDashboardHero,.clientInsightCard,.clientProfileHero,.clientWeekCard,.clientCoachCard,.planCard,.premiumLockHero,.premiumPlanHero,.currentPlanStrip,.planTeaser,.subscriptionCard,.todayNutritionCard,.attentionCard,.miniStat,.clientFact,.funnelStep,.visualMealSession,.smartMealCard,.conversation,.dialogsList,.formSection,.clientQuickStat,.clientNextMeal,.clientTimelineCard,.clientMealList,.clientCoachSummary,.clientCoachPanel,.clientPremiumCard{
  background:var(--surface)!important;
  border:1px solid var(--line)!important;
  box-shadow:var(--shadow)!important;
}
.card,.clientDashboardHero,.planCard,.premiumLockHero,.premiumPlanHero,.currentPlanStrip,.subscriptionCard,.clientCoachPanel,.clientPremiumCard{border-radius:18px!important}
.clientInsightCard,.clientQuickStat,.clientNextMeal,.miniStat,.clientFact,.funnelStep,.visualMealSession,.smartMealCard{border-radius:14px!important}
.card .card,.clientCoachCard .card,.premiumPlanHero .card,.todayNutritionCard .card{background:var(--surface-soft)!important;box-shadow:none!important}

.clientWelcome>div>span,.pageHead span,.muted,.clientHeroCopy>span,.clientHeroCopy p,.sectionSub,.clientQuickStat span,.clientQuickStat small,.clientMealList small,.planCard p,.planFeatures div,.premiumLongText{color:var(--muted)!important}
.textLink,.clientMealList a,.clientCoachCard a{color:var(--gold2)!important}

input,select,textarea,.calmUi input,.calmUi select,.calmUi textarea{background:var(--surface-soft)!important;color:var(--text)!important;border-color:var(--line2)!important;box-shadow:none!important}
input:focus,select:focus,textarea:focus{border-color:var(--gold)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--gold) 16%,transparent)!important}
.primary{background:linear-gradient(135deg,#e3c76f,#c9a24a)!important;color:#17201e!important;border:0!important;box-shadow:none!important}
.secondaryBtn,.compactBtn,.planCta{background:var(--surface-soft)!important;color:var(--text)!important;border-color:var(--line2)!important}

.tableHead,.conversationHead,.visualMealSession>header{background:var(--surface-soft)!important;color:var(--muted)!important;border-color:var(--line)!important}
.messageBubble,.chat,.telegramPreview>div,.premiumScenario,.aiObservations p{background:var(--surface-soft)!important;border-color:var(--line)!important;color:var(--text)!important}
.messageBubble.assistant,.chat.assistant{background:var(--accent-soft)!important;border-color:var(--line2)!important}

.progress,.goalProgress,.macroProgress,.macroRow>i,.heroMacroRow>i,.stackedBar,.funnelStep>i{background:color-mix(in srgb,var(--line) 72%,transparent)!important}
.progress i,.goalProgress i,.macroProgress i,.heroMacroRow em,.funnelStep em{background:linear-gradient(90deg,#c69f42,#e4c96f)!important}
.clientCalorieRing{background:conic-gradient(var(--gold) var(--progress),var(--line) 0)!important}
.clientCalorieRing:after,.kcalRing:after{background:var(--surface)!important}

.mobileTopbar{background:var(--nav)!important;border-color:var(--line)!important;box-shadow:0 1px 0 var(--line)!important}
.mobileMenuButton{background:transparent!important;border:1px solid var(--line)!important;color:var(--text)!important;box-shadow:none!important}
.mobileDrawer{background:var(--panel)!important;border-color:var(--line)!important}
.mobileDrawerHead,.mobileDrawerBottom{border-color:var(--line)!important}
.mobileDrawerNav a{color:var(--muted)!important}
.mobileDrawerNav a.active,.mobileDrawerNav a[aria-current="page"]{background:var(--accent-soft)!important;color:var(--gold2)!important}

.clientBottomNav{background:var(--nav)!important;border-color:var(--line)!important;box-shadow:0 12px 32px rgba(8,20,18,.16)!important}
.clientBottomNav a{color:var(--muted)!important}
.clientBottomNav a.active{background:var(--accent-soft)!important;color:var(--gold2)!important}

.themeToggle{position:fixed;top:max(12px,env(safe-area-inset-top));right:16px;z-index:60;width:42px;height:42px;border:1px solid var(--line);border-radius:13px;background:var(--panel);color:var(--gold2);display:grid;place-items:center;line-height:1;cursor:pointer;padding:0;box-shadow:var(--shadow)}
.themeToggle:hover{background:var(--surface-soft);border-color:var(--line2)}
.themeToggle:active{transform:scale(.96)}
.themeToggle:focus-visible{outline:2px solid var(--gold);outline-offset:2px}

@media(max-width:900px){
  .calmUi.app{padding-top:68px!important;background:var(--bg)!important}
  .calmUi .content{padding:20px 16px 96px!important;max-width:760px!important}
  .mobileTopbar{height:68px!important;padding:0 16px!important}
  .mobileMenuButton{width:42px!important;height:42px!important;border-radius:13px!important}
  .mobileBrand span{width:36px!important;height:36px!important;border-radius:12px!important}
  .themeToggle{
    z-index:110;
    top:calc(env(safe-area-inset-top) + 11px);
    right:60px;
    width:40px;
    height:40px;
    box-shadow:none;
  }
  .clientBottomNav{left:14px!important;right:14px!important;bottom:max(10px,env(safe-area-inset-bottom))!important;min-height:64px!important;padding:6px!important;border-radius:20px!important}
  .clientBottomNav a{font-size:12.5px!important;border-radius:14px!important;gap:4px!important}
  .clientBottomNav a svg{width:20px!important;height:20px!important}
  .card,.clientDashboardHero,.clientTodayHero,.todayNutritionCard,.planCard,.premiumPlanHero,.clientCoachPanel,.clientPremiumCard{border-radius:18px!important}
  .clientWelcome{margin-bottom:18px!important}
  .clientWelcome h1{font-size:28px!important;line-height:1.08!important;letter-spacing:-.7px!important}
  .clientWelcome p{font-size:12.5px!important;letter-spacing:.1em!important}
}
@media(max-width:520px){
  .calmUi .content{padding-left:14px!important;padding-right:14px!important}
  .card{padding:18px!important}
  .clientBottomNav{left:10px!important;right:10px!important}
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
        <ThemeToggle />
      </body>
    </html>
  );
}
