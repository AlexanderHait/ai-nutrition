export default function ClientDesignV3() {
  return (
    <style>{`
      /* TeddY client design v3.1 */
      .clientApp{
        --client-radius-lg:20px;
        --client-radius-md:14px;
        --client-gap:14px;
      }
      :root[data-theme="dark"] .clientApp{
        --surface:#111817;
        --surface-soft:#151f1e;
        --panel:#0d1514;
        --line:#263330;
        --line2:#34433f;
        --shadow:0 14px 36px rgba(0,0,0,.22);
        --accent-soft:#211f18;
      }
      :root[data-theme="light"] .clientApp{
        --surface:#fff;
        --surface-soft:#f4f7f4;
        --panel:#fbfcfa;
        --line:#dce4df;
        --line2:#cad6cf;
        --shadow:0 12px 28px rgba(35,58,51,.07);
        --accent-soft:#f7f0df;
      }

      .clientApp .content{display:block;max-width:980px!important}
      .clientApp .clientWelcome,.clientApp .pageHead{padding:2px 4px 8px}
      .clientApp .clientWelcome h1,.clientApp .pageHead h1{font-weight:790;letter-spacing:-1.05px;line-height:1.06}
      .clientApp .clientWelcome p,.clientApp .pageHead p{color:var(--gold2)!important}
      .clientApp .clientWelcome span,.clientApp .pageHead span{font-size:14px!important;line-height:1.45!important}

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

      .clientApp .primaryFocus{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;gap:14px!important;padding:20px!important}
      .clientApp .primaryFocus>i{width:42px!important;height:42px!important;border-radius:13px!important;background:var(--accent-soft)!important;border:0!important;color:var(--gold2)!important}
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
      .clientApp .coachHomeGrid article{background:var(--surface-soft)!important;border:1px solid var(--line)!important;border-radius:var(--client-radius-md)!important;padding:18px!important}
      .clientApp .coachHomeGrid small{color:var(--gold2)!important}
      .clientApp .coachHomeGrid b{color:var(--text)!important;font-size:15px!important}
      .clientApp .coachHomeGrid p{color:var(--muted)!important;font-size:14px!important;line-height:1.55!important}
      .clientApp .coachHomeLink{background:transparent!important;border-color:var(--line2)!important}

      .clientApp .clientMealPreview{border-color:var(--line)!important;padding:14px 0!important}
      .clientApp .clientMealPreview b,.clientApp .clientMealPreview strong{color:var(--text)!important}
      .clientApp .clientMealPreview small{color:var(--muted)!important}
      .clientApp .mealPreviewIcons i{background:var(--surface-soft)!important;border-color:var(--line)!important}

      /* Subscription */
      .clientApp .planStatus{padding:26px!important;background:var(--surface)!important}
      .clientApp .planStatus.tier-premium,.clientApp .planStatus.tier-basic{background:var(--surface)!important}
      .clientApp .planStatusBadge{background:var(--accent-soft)!important;border-color:color-mix(in srgb,var(--gold) 36%,var(--line))!important;color:var(--gold2)!important}
      .clientApp .planStatusHead{gap:8px!important}
      .clientApp .planStatusHead>b{color:var(--text)!important;font-size:22px!important;line-height:1.28!important;max-width:640px}
      .clientApp .planStatusWhen,.clientApp .planMeterTop small{color:var(--muted)!important}
      .clientApp .planStatusMeters{gap:18px!important;margin-top:24px!important}
      .clientApp .planMeterTop b{color:var(--text)!important}
      .clientApp .planMeterTrack{background:var(--surface-soft)!important;height:7px!important}

      .clientApp .planCompare{overflow:visible!important;background:transparent!important;border:0!important;box-shadow:none!important;display:grid!important;gap:14px!important}
      .clientApp .planCompareHead{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important;background:transparent!important}
      .clientApp .planCol,.clientApp .planCol.tier-premium{background:var(--surface)!important;border:1px solid var(--line)!important;border-radius:18px!important;padding:22px!important;box-shadow:var(--shadow)!important;min-width:0}
      .clientApp .planCol.current{background:var(--surface)!important;border-color:color-mix(in srgb,var(--gold) 58%,var(--line))!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--gold) 18%,transparent),var(--shadow)!important}
      .clientApp .planCol>strong{color:var(--text)!important;font-size:24px!important}
      .clientApp .planCol>p{color:var(--muted)!important;min-height:48px!important;font-size:13px!important}
      .clientApp .planColTag{top:14px!important;right:14px!important;border-radius:999px!important;padding:5px 10px!important}
      .clientApp .planColBtn{min-height:42px!important;border-radius:12px!important}
      .clientApp .planColCurrent{display:inline-flex!important;align-items:center!important;min-height:38px!important;margin-top:8px!important}

      .clientApp .planGroup{border:1px solid var(--line)!important;border-radius:18px!important;background:var(--surface)!important;padding:20px!important;box-shadow:var(--shadow)!important}
      .clientApp .planGroup h3{color:var(--muted2)!important;margin-bottom:12px!important}
      .clientApp .planRow{border-color:var(--line)!important;padding:14px 0!important}
      .clientApp .planRowName b{color:var(--text)!important}
      .clientApp .planRowName small,.clientApp .lvl span{color:var(--muted)!important}
      .clientApp .lvl em{background:var(--line)!important}
      .clientApp .trialCta{background:var(--surface)!important}

      /* Header + bottom nav */
      .clientApp .mobileTopbar{box-shadow:none!important}
      .clientApp .mobileBrand strong::after{font-size:19px!important;letter-spacing:-.45px!important}
      .clientApp .mobileMenuButton,#teddy-theme-toggle{border-radius:14px!important;background:var(--surface)!important;box-shadow:0 5px 18px rgba(21,39,34,.08)!important}
      .clientApp .clientBottomNav{max-width:660px!important;margin:0 auto!important;box-shadow:0 12px 30px rgba(7,20,17,.18)!important}
      .clientApp .clientBottomNav a.active{box-shadow:none!important}

      @media(max-width:700px){
        .clientApp .content{padding:22px 18px 132px!important}
        .clientApp .clientWelcome,.clientApp .pageHead{padding-left:2px!important;padding-right:2px!important}
        .clientApp .clientWelcome h1,.clientApp .pageHead h1{font-size:30px!important}
        .clientApp .primaryFocus{padding:18px!important;border-radius:18px!important}
        .clientApp .todayNutritionCard,.clientApp .card,.clientApp .planStatus{border-radius:18px!important}
        .clientApp .todayNutritionCard{padding:20px!important}
        .clientApp .coachHome{padding:20px!important}
        .clientApp .coachHomeGrid article{padding:16px!important}
        .clientApp .planStatus{padding:22px!important}
        .clientApp .planStatusHead>b{font-size:20px!important}
        .clientApp .planStatusMeters{grid-template-columns:1fr!important;gap:16px!important}

        .clientApp .planCompareHead{grid-template-columns:1fr!important;gap:12px!important}
        .clientApp .planCol,.clientApp .planCol.tier-premium{padding:22px!important;border-radius:18px!important}
        .clientApp .planCol>p{min-height:0!important}
        .clientApp .planColTag{top:14px!important;right:14px!important}
        .clientApp .planGroup{padding:18px!important;border-radius:18px!important}
        .clientApp .planRow{gap:10px!important}
        .clientApp .planRowCells{gap:8px!important}

        .clientApp .clientBottomNav{left:16px!important;right:16px!important;bottom:max(12px,env(safe-area-inset-bottom))!important;min-height:60px!important;border-radius:20px!important;padding:6px!important}
        .clientApp .clientBottomNav a{font-size:11.5px!important;border-radius:15px!important;gap:4px!important}
        .clientApp .clientBottomNav a svg{width:19px!important;height:19px!important}
      }

      @media(max-width:430px){
        .clientApp .content{padding-left:14px!important;padding-right:14px!important}
        .clientApp .clientWelcome h1,.clientApp .pageHead h1{font-size:28px!important}
        .clientApp .planStatus,.clientApp .planCol,.clientApp .planGroup{padding:18px!important}
        .clientApp .planRowCells{grid-template-columns:1fr!important;gap:7px!important}
        .clientApp .lvl{grid-template-columns:72px 1fr!important;align-items:center!important}
        .clientApp .clientBottomNav{left:10px!important;right:10px!important}
      }
    `}</style>
  );
}
