export default function ClientLightThemeAudit() {
  return (
    <style>{`
      /* Exact light-theme audit fixes. Keep dark theme untouched. */
      :root[data-theme="light"] .clientApp {
        --audit-text:#173a32;
        --audit-body:#35564e;
        --audit-muted:#557068;
        --audit-soft:#f3f7f4;
        --audit-card:#ffffff;
        --audit-line:#c8d8d0;
        --audit-track:#e3ebe7;
      }

      :root[data-theme="light"] .clientApp .nutritionDay,
      :root[data-theme="light"] .clientApp .clientSessionCard,
      :root[data-theme="light"] .clientApp .clientSessionCard > summary,
      :root[data-theme="light"] .clientApp .sessionItems,
      :root[data-theme="light"] .clientApp .sessionFoodRow,
      :root[data-theme="light"] .clientApp .coachWorkGrid .card,
      :root[data-theme="light"] .clientApp .coachHomeGrid article,
      :root[data-theme="light"] .clientApp .clientTags span,
      :root[data-theme="light"] .clientApp .formSection,
      :root[data-theme="light"] .clientApp .weightTarget {
        background:var(--audit-card)!important;
        color:var(--audit-text)!important;
        border-color:var(--audit-line)!important;
      }

      :root[data-theme="light"] .clientApp .nutritionDayHead,
      :root[data-theme="light"] .clientApp .sessionFoodRow,
      :root[data-theme="light"] .clientApp .coachHomeGrid article,
      :root[data-theme="light"] .clientApp .formSection,
      :root[data-theme="light"] .clientApp .clientTags span {
        background:var(--audit-soft)!important;
      }

      :root[data-theme="light"] .clientApp .nutritionDay,
      :root[data-theme="light"] .clientApp .clientSessionCard {
        box-shadow:0 8px 22px rgba(28,55,47,.07)!important;
      }

      :root[data-theme="light"] .clientApp .clientSessionCard > summary,
      :root[data-theme="light"] .clientApp .sessionFoodRow {
        box-shadow:none!important;
      }

      :root[data-theme="light"] .clientApp .clientTags span {
        padding:8px 11px!important;
        border:1px solid var(--audit-line)!important;
        border-radius:999px!important;
        color:var(--audit-body)!important;
      }

      :root[data-theme="light"] .clientApp .sessionIconStack i,
      :root[data-theme="light"] .clientApp .mealPreviewIcons i,
      :root[data-theme="light"] .clientApp .sessionFoodRow > i,
      :root[data-theme="light"] .clientApp .primaryFocus > i,
      :root[data-theme="light"] .clientApp .nextMealCard > i {
        background:#f5f0e4!important;
        border-color:#ded4bc!important;
        color:#987414!important;
      }

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
      :root[data-theme="light"] .clientApp .todayActions > span a {
        color:var(--audit-muted)!important;
        opacity:1!important;
      }

      :root[data-theme="light"] .clientApp .coachText,
      :root[data-theme="light"] .clientApp .coachHomeGrid p,
      :root[data-theme="light"] .clientApp .signalRow small {
        color:var(--audit-body)!important;
        line-height:1.55!important;
      }

      :root[data-theme="light"] .clientApp .kcalRing {
        background:conic-gradient(var(--ring-color,#d8b85f) var(--progress,0%),var(--audit-track) 0)!important;
      }
      :root[data-theme="light"] .clientApp .kcalRing:after {
        background:var(--audit-card)!important;
      }
      :root[data-theme="light"] .clientApp .kcalRing small {
        color:var(--audit-muted)!important;
      }
      :root[data-theme="light"] .clientApp .macroRow > i {
        background:var(--audit-track)!important;
      }

      :root[data-theme="light"] .clientApp .weekBarTrack {
        background:var(--audit-track)!important;
        border:1px solid #d7e2dc!important;
      }
      :root[data-theme="light"] .clientApp .weekBar.empty {
        background:transparent!important;
      }
      :root[data-theme="light"] .clientApp .weekTargetLine {
        border-color:#9b7b22!important;
        opacity:.75!important;
      }

      :root[data-theme="light"] .clientApp input,
      :root[data-theme="light"] .clientApp textarea,
      :root[data-theme="light"] .clientApp select {
        background:#f8fbf9!important;
        color:var(--audit-text)!important;
        border-color:var(--audit-line)!important;
      }

      @media(max-width:700px){
        :root[data-theme="light"] .clientApp .coachText,
        :root[data-theme="light"] .clientApp .coachHomeGrid p,
        :root[data-theme="light"] .clientApp .signalRow small {
          font-size:14px!important;
        }
        :root[data-theme="light"] .clientApp .weekChart {
          height:122px!important;
          gap:6px!important;
        }
        :root[data-theme="light"] .clientApp .kcalRing {
          width:118px!important;
          height:118px!important;
        }
      }
    `}</style>
  );
}
