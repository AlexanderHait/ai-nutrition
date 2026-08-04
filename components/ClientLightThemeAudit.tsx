export default function ClientLightThemeAudit() {
  return (
    <style>{`
      :root[data-theme="light"] .clientApp {
        --audit-text:#173a32;
        --audit-body:#35564e;
        --audit-muted:#557068;
        --audit-soft:#f3f7f4;
        --audit-card:#fffefa;
        --audit-card-strong:#ffffff;
        --audit-line:#c8d8d0;
        --audit-track:#e3ebe7;
        --audit-shadow:0 12px 34px rgba(28,55,47,.08);
      }

      :root[data-theme="light"] .clientApp,
      :root[data-theme="light"] .clientApp .content {
        color:var(--audit-text)!important;
      }

      :root[data-theme="light"] .clientApp .card,
      :root[data-theme="light"] .clientApp .stat,
      :root[data-theme="light"] .clientApp .heroKcal,
      :root[data-theme="light"] .clientApp .clientTodayHero,
      :root[data-theme="light"] .clientApp .clientDashboardHero,
      :root[data-theme="light"] .clientApp .clientQuickStat,
      :root[data-theme="light"] .clientApp .clientMetricCard,
      :root[data-theme="light"] .clientApp .clientMacroCard,
      :root[data-theme="light"] .clientApp .progressSummaryCard,
      :root[data-theme="light"] .clientApp .clientProfileHero,
      :root[data-theme="light"] .clientApp .profileOverviewItem,
      :root[data-theme="light"] .clientApp .profileHub,
      :root[data-theme="light"] .clientApp .profileHub a,
      :root[data-theme="light"] .clientApp .secondaryDisclosure,
      :root[data-theme="light"] .clientApp .supportCard,
      :root[data-theme="light"] .clientApp .supportIntro > div,
      :root[data-theme="light"] .clientApp .supportUnavailable,
      :root[data-theme="light"] .clientApp .nutritionDay,
      :root[data-theme="light"] .clientApp .clientSessionCard,
      :root[data-theme="light"] .clientApp .clientSessionCard > summary,
      :root[data-theme="light"] .clientApp .sessionItems,
      :root[data-theme="light"] .clientApp .sessionFoodRow,
      :root[data-theme="light"] .clientApp .coachWorkGrid .card,
      :root[data-theme="light"] .clientApp .coachHomeGrid article,
      :root[data-theme="light"] .clientApp .coachPrimaryCard,
      :root[data-theme="light"] .clientApp .coachMetric,
      :root[data-theme="light"] .clientApp .coachContentCard,
      :root[data-theme="light"] .clientApp .coachQuickLink,
      :root[data-theme="light"] .clientApp .clientTags span,
      :root[data-theme="light"] .clientApp .formSection,
      :root[data-theme="light"] .clientApp .weightTarget,
      :root[data-theme="light"] .clientApp .clientWeekCards a,
      :root[data-theme="light"] .clientApp .nutritionCalendarStrip a {
        background:var(--audit-card)!important;
        color:var(--audit-text)!important;
        border-color:var(--audit-line)!important;
        box-shadow:var(--audit-shadow)!important;
      }

      :root[data-theme="light"] .clientApp .nutritionDayHead,
      :root[data-theme="light"] .clientApp .sessionFoodRow,
      :root[data-theme="light"] .clientApp .coachHomeGrid article,
      :root[data-theme="light"] .clientApp .formSection,
      :root[data-theme="light"] .clientApp .clientTags span,
      :root[data-theme="light"] .clientApp .coachRisk,
      :root[data-theme="light"] .clientApp .coachProgress,
      :root[data-theme="light"] .clientApp .clientQuickStat > i,
      :root[data-theme="light"] .clientApp .clientMetricCard > i,
      :root[data-theme="light"] .clientApp .profileHub i,
      :root[data-theme="light"] .clientApp .supportIntro i {
        background:var(--audit-soft)!important;
      }

      :root[data-theme="light"] .clientApp .clientSessionCard > summary,
      :root[data-theme="light"] .clientApp .sessionFoodRow {
        box-shadow:none!important;
      }

      :root[data-theme="light"] .clientApp .sessionItems {
        border-top-color:var(--audit-line)!important;
      }

      :root[data-theme="light"] .clientApp .clientTags span {
        padding:8px 11px!important;
        border-radius:999px!important;
        color:var(--audit-body)!important;
      }

      :root[data-theme="light"] .clientApp .sessionIconStack i,
      :root[data-theme="light"] .clientApp .mealPreviewIcons i,
      :root[data-theme="light"] .clientApp .sessionFoodRow > i,
      :root[data-theme="light"] .clientApp .primaryFocus > i,
      :root[data-theme="light"] .clientApp .nextMealCard > i,
      :root[data-theme="light"] .clientApp .supportAvatar {
        background:#f5f0e4!important;
        border-color:#ded4bc!important;
        color:#987414!important;
      }

      :root[data-theme="light"] .clientApp p,
      :root[data-theme="light"] .clientApp small,
      :root[data-theme="light"] .clientApp .muted,
      :root[data-theme="light"] .clientApp .pageHead span,
      :root[data-theme="light"] .clientApp .coachText,
      :root[data-theme="light"] .clientApp .coachHomeGrid p,
      :root[data-theme="light"] .clientApp .signalRow small,
      :root[data-theme="light"] .clientApp .clientMealPreview small,
      :root[data-theme="light"] .clientApp .sessionTitle small,
      :root[data-theme="light"] .clientApp .sessionFoodRow small,
      :root[data-theme="light"] .clientApp .nutritionDayHead span,
      :root[data-theme="light"] .clientApp .nutritionDayTotal small,
      :root[data-theme="light"] .clientApp .kcalRingSide > span,
      :root[data-theme="light"] .clientApp .macroRow > span,
      :root[data-theme="light"] .clientApp .weekCol small,
      :root[data-theme="light"] .clientApp .weekCol em,
      :root[data-theme="light"] .clientApp .todayActions > span a,
      :root[data-theme="light"] .clientApp .clientQuickStat small,
      :root[data-theme="light"] .clientApp .clientQuickStat em,
      :root[data-theme="light"] .clientApp .clientMetricCard small,
      :root[data-theme="light"] .clientApp .clientMetricCard em,
      :root[data-theme="light"] .clientApp .profileOverviewItem span,
      :root[data-theme="light"] .clientApp .supportHeader span,
      :root[data-theme="light"] .clientApp .supportIntro small {
        color:var(--audit-muted)!important;
        opacity:1!important;
      }

      :root[data-theme="light"] .clientApp h1,
      :root[data-theme="light"] .clientApp h2,
      :root[data-theme="light"] .clientApp h3,
      :root[data-theme="light"] .clientApp b,
      :root[data-theme="light"] .clientApp strong,
      :root[data-theme="light"] .clientApp .coachReadable,
      :root[data-theme="light"] .clientApp .coachText,
      :root[data-theme="light"] .clientApp .coachHomeGrid p,
      :root[data-theme="light"] .clientApp .signalRow small {
        color:var(--audit-text)!important;
      }

      :root[data-theme="light"] .clientApp .clientCalorieRing,
      :root[data-theme="light"] .clientApp .kcalRing {
        background:conic-gradient(var(--ring-color,#d8b85f) var(--progress,0%),var(--audit-track) 0)!important;
      }
      :root[data-theme="light"] .clientApp .clientCalorieRing:after,
      :root[data-theme="light"] .clientApp .kcalRing:after {
        background:var(--audit-card-strong)!important;
      }
      :root[data-theme="light"] .clientApp .clientCalorieRing span,
      :root[data-theme="light"] .clientApp .kcalRing small {
        color:var(--audit-muted)!important;
      }

      :root[data-theme="light"] .clientApp .heroMacroRow > i,
      :root[data-theme="light"] .clientApp .macroRow > i,
      :root[data-theme="light"] .clientApp .progress,
      :root[data-theme="light"] .clientApp .goalProgress,
      :root[data-theme="light"] .clientApp .macroProgress,
      :root[data-theme="light"] .clientApp .weekBarTrack,
      :root[data-theme="light"] .clientApp .clientWeekCards i,
      :root[data-theme="light"] .clientApp .clientWeekTrack {
        background:var(--audit-track)!important;
        border-color:#d7e2dc!important;
      }

      :root[data-theme="light"] .clientApp .weekBar.empty {
        background:transparent!important;
      }
      :root[data-theme="light"] .clientApp .weekTargetLine,
      :root[data-theme="light"] .clientApp .clientWeekTrack em {
        border-color:#9b7b22!important;
        opacity:.75!important;
      }

      :root[data-theme="light"] .clientApp input,
      :root[data-theme="light"] .clientApp textarea,
      :root[data-theme="light"] .clientApp select,
      :root[data-theme="light"] .clientApp .supportComposerRow textarea {
        background:#f8fbf9!important;
        color:var(--audit-text)!important;
        border-color:var(--audit-line)!important;
      }

      :root[data-theme="light"] .clientApp .supportComposerV2,
      :root[data-theme="light"] .clientApp .supportPreview,
      :root[data-theme="light"] .clientApp .supportAttachButton,
      :root[data-theme="light"] .clientApp .supportBubble,
      :root[data-theme="light"] .clientApp .supportEmpty {
        background:var(--audit-soft)!important;
        color:var(--audit-text)!important;
        border-color:var(--audit-line)!important;
      }

      :root[data-theme="light"] .clientApp .supportBubble.own {
        background:#f8efd5!important;
        border-color:#dfcf9b!important;
      }

      @media(max-width:700px){
        :root[data-theme="light"] .clientApp .coachText,
        :root[data-theme="light"] .clientApp .coachHomeGrid p,
        :root[data-theme="light"] .clientApp .signalRow small {font-size:14px!important}
        :root[data-theme="light"] .clientApp .weekChart {height:122px!important;gap:6px!important}
        :root[data-theme="light"] .clientApp .kcalRing {width:118px!important;height:118px!important}
      }
    `}</style>
  );
}
