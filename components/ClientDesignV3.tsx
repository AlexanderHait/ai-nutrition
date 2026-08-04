export default function ClientDesignV3() {
  return (
    <style>{`
      /* TeddY client design v3 — one visual language for all client pages */
      .clientApp{
        --client-radius-lg:22px;
        --client-radius-md:16px;
        --client-gap:14px;
      }

      .clientApp .content{display:block}
      .clientApp .clientWelcome,.clientApp .pageHead{padding:2px 2px 6px}
      .clientApp .clientWelcome h1,.clientApp .pageHead h1{font-weight:780;letter-spacing:-1.05px}
      .clientApp .clientWelcome p,.clientApp .pageHead p{color:var(--gold2)!important}

      .clientApp .primaryFocus,
      .clientApp .todayNutritionCard,
      .clientApp .nextMealCard,
      .clientApp .coachHome,
      .clientApp .recentMealsCompact,
      .clientApp .calmSignals,
      .clientApp .planStatus,
      .clientApp .planCompare,
      .clientApp .trialCta,
      .clientApp .progressNarrative,
      .clientApp .goalJourney,
      .clientApp .coachDecision{
        background:var(--surface)!important;
        border:1px solid var(--line)!important;
        border-radius:var(--client-radius-lg)!important;
        box-shadow:var(--shadow)!important;
      }

      .clientApp .primaryFocus{
        display:grid!important;
        grid-template-columns:auto minmax(0,1fr)!important;
        gap:14px!important;
        padding:20px!important;
      }
      .clientApp .primaryFocus>i{
        width:42px!important;height:42px!important;border-radius:13px!important;
        background:var(--accent-soft)!important;border:0!important;color:var(--gold2)!important;
      }
      .clientApp .primaryFocus small{color:var(--gold2)!important;font-size:12px!important;letter-spacing:.11em!important}
      .clientApp .primaryFocus b{color:var(--text)!important;font-size:17px!important;line-height:1.25!important}
      .clientApp .primaryFocus p{color:var(--muted)!important;font-size:14px!important;line-height:1.5!important}
      .clientApp .primaryFocus>a{grid-column:2;color:var(--gold2)!important;font-size:13px!important}

      .clientApp .todayNutritionCard{padding:24px!important;gap:20px!important}
      .clientApp .todayActions{border-top:1px solid var(--line)!important;padding-top:18px!important}
      .clientApp .todayActions>span a{color:var(--muted)!important}
      .clientApp .calorieRing,.clientApp .clientCalorieRing{filter:none!important}
      .clientApp .macroRow>i,.clientApp .heroMacroRow>i{background:var(--surface-soft)!important}

      .clientApp .card{background:var(--surface)!important;border-color:var(--line)!important;box-shadow:var(--shadow)!important}
      .clientApp .nextMealCard{padding:18px!important}
      .clientApp .nextMealCard>i{background:var(--surface-soft)!important;border-color:var(--line)!important;color:var(--gold2)!important}
      .clientApp .nextMealCard small,.clientApp .nextMealCard p{color:var(--muted)!important}
      .clientApp .nextMealCard b{color:var(--text)!important;font-size:14px!important}

      .clientApp .signalRow{border-color:var(--line)!important}
      .clientApp .signalRow>i{background:var(--surface-soft)!important;border-color:var(--line)!important}
      .clientApp .signalRow b{color:var(--text)!important;font-size:14px!important}
      .clientApp .signalRow small{color:var(--muted)!important;font-size:13px!important}

      .clientApp .coachHome{padding:22px!important}
      .clientApp .coachHomeGrid{gap:12px!important}
      .clientApp .coachHomeGrid article{
        background:var(--surface-soft)!important;
        border:1px solid var(--line)!important;
        border-radius:var(--client-radius-md)!important;
        padding:18px!important;
      }
      .clientApp .coachHomeGrid small{color:var(--gold2)!important}
      .clientApp .coachHomeGrid b{color:var(--text)!important;font-size:15px!important}
      .clientApp .coachHomeGrid p{color:var(--muted)!important;font-size:14px!important;line-height:1.55!important}
      .clientApp .coachHomeLink{background:transparent!important;border-color:var(--line2)!important}

      .clientApp .clientMealPreview{border-color:var(--line)!important;padding:14px 0!important}
      .clientApp .clientMealPreview b,.clientApp .clientMealPreview strong{color:var(--text)!important}
      .clientApp .clientMealPreview small{color:var(--muted)!important}
      .clientApp .mealPreviewIcons i{background:var(--surface-soft)!important;border-color:var(--line)!important}

      /* Subscription page */
      .clientApp .planStatus{padding:22px!important;background:var(--surface)!important}
      .clientApp .planStatus.tier-premium,.clientApp .planStatus.tier-basic{background:var(--surface)!important}
      .clientApp .planStatusBadge{background:var(--accent-soft)!important;border-color:var(--line2)!important}
      .clientApp .planStatusHead>b{color:var(--text)!important;font-size:20px!important}
      .clientApp .planStatusWhen,.clientApp .planMeterTop small{color:var(--muted)!important}
      .clientApp .planMeterTop b{color:var(--text)!important}
      .clientApp .planMeterTrack{background:var(--surface-soft)!important}

      .clientApp .planCompare{overflow:hidden;background:var(--surface)!important}
      .clientApp .planCompareHead{gap:0!important;background:var(--line)!important}
      .clientApp .planCol,.clientApp .planCol.tier-premium{
        background:var(--surface)!important;
        border-right:1px solid var(--line)!important;
        padding:20px 18px!important;
      }
      .clientApp .planCol:last-child{border-right:0!important}
      .clientApp .planCol.current{background:var(--accent-soft)!important;box-shadow:none!important}
      .clientApp .planCol>strong{color:var(--text)!important}
      .clientApp .planCol>p{color:var(--muted)!important}
      .clientApp .planColTag{border-radius:0 0 0 10px!important}
      .clientApp .planGroup{border-color:var(--line)!important;background:var(--surface)!important;padding:18px!important}
      .clientApp .planGroup h3{color:var(--muted2)!important}
      .clientApp .planRow{border-color:var(--line)!important;padding:13px 0!important}
      .clientApp .planRowName b{color:var(--text)!important}
      .clientApp .planRowName small,.clientApp .lvl span{color:var(--muted)!important}
      .clientApp .lvl em{background:var(--line)!important}
      .clientApp .trialCta{background:var(--surface)!important}

      /* Navigation should support content, not cover it */
      .clientApp .clientBottomNav{max-width:680px!important;margin:0 auto!important}

      @media(max-width:700px){
        .clientApp .content{padding:22px 16px 116px!important}
        .clientApp .primaryFocus{padding:18px!important;border-radius:18px!important}
        .clientApp .todayNutritionCard,.clientApp .card,.clientApp .planStatus,.clientApp .planCompare{border-radius:18px!important}
        .clientApp .todayNutritionCard{padding:20px!important}
        .clientApp .coachHome{padding:20px!important}
        .clientApp .coachHomeGrid article{padding:16px!important}
        .clientApp .clientBottomNav{
          left:16px!important;right:16px!important;bottom:max(12px,env(safe-area-inset-bottom))!important;
          min-height:58px!important;border-radius:18px!important;padding:5px!important;
        }
        .clientApp .clientBottomNav a{font-size:11.5px!important;border-radius:13px!important}
        .clientApp .clientBottomNav a svg{width:19px!important;height:19px!important}
        .clientApp .planCompareHead{grid-template-columns:1fr!important;background:var(--surface)!important}
        .clientApp .planCol{border-right:0!important;border-bottom:1px solid var(--line)!important;padding:18px!important}
        .clientApp .planCol:last-child{border-bottom:0!important}
        .clientApp .planCol>p{min-height:0!important}
        .clientApp .planColTag{top:10px!important;right:10px!important;border-radius:999px!important}
        .clientApp .planRowCells{gap:6px!important}
      }
    `}</style>
  );
}
