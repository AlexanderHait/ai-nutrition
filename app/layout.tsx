import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    { media: "(prefers-color-scheme: light)", color: "#e9f1ed" },
    { media: "(prefers-color-scheme: dark)", color: "#10211f" },
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
      button.textContent = dark ? '☀️' : '🌙';
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
  --bg:#10211f;--panel:#162b28;--panel2:#1b3430;--line:#294640;--line2:#355951;
  --text:#eff8f4;--muted:#9db3ac;--muted2:#738f87;--gold:#8fd8b8;--gold2:#55b798;
  --green:#78d3a1;--red:#e28a8a;--shadow:0 20px 60px rgba(4,17,15,.34);
}
:root[data-theme="light"]{
  --bg:#e9f1ed;--panel:#f6f3eb;--panel2:#eef4ef;--line:#cfddd6;--line2:#b9cec5;
  --text:#153a35;--muted:#617d76;--muted2:#7b938d;--gold:#167c68;--gold2:#0e6656;
  --green:#2b9566;--red:#b95353;--shadow:0 16px 44px rgba(35,72,63,.12);
}
html,body{transition:background-color .2s ease,color .2s ease}
:root[data-theme="dark"] body{background:radial-gradient(900px 520px at 65% -160px,rgba(78,190,157,.12),transparent 58%),var(--bg)!important}
:root[data-theme="light"] body{background:radial-gradient(900px 520px at 65% -160px,rgba(71,165,139,.12),transparent 58%),var(--bg)!important}
:root[data-theme="dark"] .side,:root[data-theme="dark"] .mobileTopbar,:root[data-theme="dark"] .mobileNav{background:rgba(16,33,31,.92)!important;border-color:var(--line)!important}
:root[data-theme="light"] .side,:root[data-theme="light"] .mobileTopbar,:root[data-theme="light"] .mobileNav{background:rgba(238,244,239,.94)!important;border-color:var(--line)!important}
:root[data-theme="light"] .card,:root[data-theme="light"] .stat,:root[data-theme="light"] .heroKcal,:root[data-theme="light"] .clientTodayHero,:root[data-theme="light"] .progressSummaryCard,:root[data-theme="light"] .clientMacroCard,
:root[data-theme="light"] .conversation,:root[data-theme="light"] .dialogsList,:root[data-theme="light"] .planCard,:root[data-theme="light"] .subscriptionCard{background:linear-gradient(180deg,#f8f5ee,#eef4ef)!important;border-color:var(--line)!important;box-shadow:var(--shadow)!important}
:root[data-theme="dark"] .card,:root[data-theme="dark"] .stat,:root[data-theme="dark"] .heroKcal,:root[data-theme="dark"] .clientTodayHero,:root[data-theme="dark"] .progressSummaryCard,:root[data-theme="dark"] .clientMacroCard{background:linear-gradient(180deg,#18302c,#132724)!important;border-color:var(--line)!important}
:root[data-theme="light"] input,:root[data-theme="light"] select,:root[data-theme="light"] textarea{background:#fbfaf6!important;color:var(--text)!important;border-color:var(--line2)!important}
:root[data-theme="dark"] input,:root[data-theme="dark"] select,:root[data-theme="dark"] textarea{background:#102320!important;color:var(--text)!important;border-color:var(--line2)!important}
:root[data-theme="light"] .tableHead,:root[data-theme="light"] .conversationHead,:root[data-theme="light"] .formSection,:root[data-theme="light"] .miniStat,:root[data-theme="light"] .clientFact{background:#e6efea!important;border-color:var(--line)!important}
:root[data-theme="light"] .tableRow:hover,:root[data-theme="light"] .dialogPerson:hover,:root[data-theme="light"] .dialogPerson.active{background:#ddeae4!important}
:root[data-theme="light"] .messageBubble,:root[data-theme="light"] .chat{background:#edf3ef!important;border-color:var(--line)!important}
:root[data-theme="light"] .messageBubble.assistant,:root[data-theme="light"] .chat.assistant{background:#e1efe8!important;border-color:#bad5ca!important}
:root[data-theme="light"] .messageBubble p,:root[data-theme="light"] .digest{color:#264c45!important}
:root[data-theme="light"] .desktopNav a:hover,:root[data-theme="light"] .sideLogout:hover{background:#dce9e3!important;color:var(--text)!important}
:root[data-theme="light"] .progress,:root[data-theme="light"] .goalProgress,:root[data-theme="light"] .macroProgress,:root[data-theme="light"] .macroRow>i{background:#cbdcd4!important}
:root[data-theme="light"] .progress i,:root[data-theme="light"] .goalProgress i,:root[data-theme="light"] .macroProgress i{background:linear-gradient(90deg,#1c8f75,#69c5a6)!important}
#teddy-theme-toggle{position:fixed;top:max(12px,env(safe-area-inset-top));right:14px;z-index:9999;width:44px;height:44px;border:1px solid var(--line2);border-radius:14px;background:var(--panel);color:var(--text);display:grid;place-items:center;font-size:20px;line-height:1;cursor:pointer;box-shadow:var(--shadow);transition:transform .15s ease,background .2s ease,border-color .2s ease}
#teddy-theme-toggle:hover{transform:translateY(-1px)}
#teddy-theme-toggle:active{transform:scale(.96)}
@media(max-width:900px){#teddy-theme-toggle{top:max(10px,env(safe-area-inset-top));right:12px;width:40px;height:40px;border-radius:12px;font-size:18px}}
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
