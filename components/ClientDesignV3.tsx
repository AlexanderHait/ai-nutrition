export default function ClientDesignV3() {
  return (
    <style>{`
      /* TeddY client design v3.6 — exact component theming */
      .clientApp{--client-radius-lg:20px;--client-radius-md:14px}
      :root[data-theme="light"] .clientApp{
        --surface:#ffffff;--surface-soft:#f2f6f3;--panel:#f7faf8;
        --line:#c8d6cf;--line2:#b4c7bd;--text:#173a32;
        --body:#294b43;--muted:#48645c;--muted2:#60766f;
        --accent-soft:#f6eedb;--chart-empty:#e5ece8;--chart-line:#9b7b22;
        --shadow:0 10px 26px rgba(28,55,47,.08)
      }
      :root[data-theme="dark"] .clientApp{
        --surface:#111a18;--surface-soft:#16211f;--panel:#0d1614;
        --line:#293936;--line2:#3a4c48;--text:#f0f4f2;
        --body:#d8e1de;--muted:#a6b5b0;--muted2:#8fa19b;
        --accent-soft:#242117;--chart-empty:#202a28;--chart-line:#d6b34f;
        --shadow:0 12px 30px rgba(0,0,0,.24)
      }

      .clientApp .content{display:block;max-width:980px!important}
      .clientApp h1,.clientApp h2,.clientApp h3,.clientApp b,.clientApp strong{
        color:var(--text)!important
      }
      .clientApp p,.clientApp label,.clientApp li,.clientApp .bodyText{
        color:var(--body)!important;opacity:1!important
      }
      .clientApp small,.clientApp .muted,.clientApp .pageHead span,
      .clientApp .clientWelcome span,.clientApp .profileOverviewItem span,
      .clientApp .profileHub small,.clientApp .sessionTitle small,
      .clientApp .sessionTotal small,.clientApp .nutritionDayHead span{
        color:var(--muted)!important;opacity:1!important
      }
      .clientApp .pageHead h1,.clientApp .clientWelcome h1{
        color:var(--text)!important;font-weight:790;letter-spacing:-1px;line-height:1.07
      }

      .clientApp .card,.clientApp .primaryFocus,.clientApp .todayNutritionCard,
      .clientApp .nextMealCard,.clientApp .coachHome,.clientApp .recentMealsCompact,
      .clientApp .calmSignals,.clientApp .planStatus,.clientApp .trialCta,
      .clientApp .progressNarrative,.clientApp .goalJourney,.clientApp .coachDecision,
      .clientApp .clientProfileHero,.clientApp .profileOverviewItem,.clientApp .profileHub>a,
      .clientApp .secondaryDisclosure,.clientApp .progressKeyStat,.clientApp .macroSummaryCard,
      .clientApp .coachSituations>a,.clientApp .visualMealSession,.clientApp .visualMealItem,
      .clientApp .smartMealCard,.clientApp .clientMealList,.clientApp .clientTimelineCard,
      .clientApp .clientCoachSummary,.clientApp .clientCoachPanel,.clientApp .periodSwitch,
      .clientApp .planCol,.clientApp .planGroup,.clientApp .nutritionDay,
      .clientApp .clientSessionCard,.clientApp .sessionFoodRow{
        background:var(--surface)!important;border:1px solid var(--line)!important;
        color:var(--text)!important;box-shadow:var(--shadow)!important
      }

      .clientApp .visualMealItem,.clientApp .mealSessionCard,.clientApp .mealRow,
      .clientApp .coachHomeGrid article,.clientApp .sessionItems,
      .clientApp .clientSessionCard>summary,.clientApp .nutritionDayHead{
        background:var(--surface-soft)!important;border-color:var(--line)!important
      }

      /* Exact light-theme cleanup for legacy dark blocks */
      :root[data-theme="light"] .clientApp .nutritionDay,
      :root[data-theme="light"] .clientApp .clientSessionCard,
      :root[data-theme="light"] .clientApp .clientSessionCard>summary,
      :root[data-theme="light"] .clientApp .sessionItems,
      :root[data-theme="light"] .clientApp .sessionFoodRow,
      :root[data-theme="light"] .clientApp .visualMealHistory,
      :root[data-theme="light"] .clientApp .coachHomeGrid article,
      :root[data-theme="light"] .clientApp .clientCoachPanel,
      :root[data-theme="light"] .clientApp .clientCoachSummary{
        background:var(--surface)!important;color:var(--text)!important
      }
      :root[data-theme="light"] .clientApp .nutritionDay{
        border-color:var(--line)!important;overflow:hidden!important
      }
      :root[data-theme="light"] .clientApp .nutritionDayHead{
        background:#f7faf8!important;border-bottom:1px solid var(--line)!important
      }
      :root[data-theme="light"] .clientApp .clientSessionCard{
        box-shadow:none!important;border-color:var(--line)!important
      }
      :root[data-theme="light"] .clientApp .clientSessionCard>summary{
        background:#ffffff!important
      }
      :root[data-theme="light"] .clientApp .sessionFoodRow{
        background:#f7faf8!important;border-color:var(--line)!important;box-shadow:none!important
      }
      :root[data-theme="light"] .clientApp .sessionTitle b,
      :root[data-theme="light"] .clientApp .sessionTotal b,
      :root[data-theme="light"] .clientApp .nutritionDayHead h2,
      :root[data-theme="light"] .clientApp .nutritionDayTotal b{
        color:var(--text)!important
      }
      :root[data-theme="light"] .clientApp .sessionTitle small,
      :root[data-theme="light"] .clientApp .sessionFoodRow small,
      :root[data-theme="light"] .clientApp .nutritionDayHead span,
      :root[data-theme="light"] .clientApp .nutritionDayTotal small{
        color:var(--muted)!important
      }

      :root[data-theme="light"] .clientApp input,
      :root[data-theme="light"] .clientApp textarea,
      :root[data-theme="light"] .clientApp select{
        color:#244941!important;background:#f8fbf9!important;border-color:var(--line)!important
      }

      /* Subscription */
      .clientApp .planCompare{background:transparent!important;border:0!important;box-shadow:none!important;display:grid!important;gap:14px!important}
      .clientApp .planCompareHead{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important;background:transparent!important}
      .clientApp .planCol{border-radius:18px!important;padding:22px!important;min-width:0}
      .clientApp .planCol.current{border-color:color-mix(in srgb,var(--gold) 58%,var(--line))!important}
      .clientApp .planGroup{border-radius:18px!important;padding:20px!important}
      .clientApp .planStatus{border-radius:20px!important;padding:24px!important}
      .clientApp .planMeterTrack{display:block!important;height:7px!important;border-radius:999px!important;background:var(--surface-soft)!important;overflow:hidden!important}
      .clientApp .planMeterTrack em{display:block!important;height:100%!important;border-radius:999px!important;background:linear-gradient(90deg,#d6b34f,#9e83d6)!important}
      .clientApp .lvl{gap:7px!important}
      .clientApp .lvl i{position:relative!important;display:block!important;height:6px!important;border-radius:999px!important;background:var(--line)!important;overflow:hidden!important}
      .clientApp .lvl i em{display:none!important}
      .clientApp .lvl i::after{content:"";position:absolute;inset:0 auto 0 0;width:0;border-radius:999px;background:var(--tier-free)}
      .clientApp .lvl.tier-basic i::after{background:var(--tier-basic)}
      .clientApp .lvl.tier-premium i::after{background:linear-gradient(90deg,var(--tier-premium),var(--tier-premium-2))}
      .clientApp .lvl i:has(em:nth-child(1).on)::after{width:34%}
      .clientApp .lvl i:has(em:nth-child(2).on)::after{width:67%}
      .clientApp .lvl i:has(em:nth-child(3).on)::after{width:100%}

      /* Progress charts */
      .clientApp .progressCharts{grid-template-columns:1fr!important;gap:14px!important}
      .clientApp .progressChartCard,.clientApp .weightProgressCard{overflow:hidden!important}
      .clientApp .weightProgressCard .sectionTitleRow>svg{width:18px!important;height:18px!important;max-width:18px!important;max-height:18px!important;opacity:.7}
      .clientApp .weightHistory{margin-top:8px!important}
      .clientApp .macroSummaryGrid{grid-template-columns:1fr!important}
      .clientApp .macroSummaryCard{padding:16px!important;border-radius:14px!important}

      .clientApp .calorieMobileChart{
        display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;
        align-items:end!important;gap:8px!important;width:100%!important;
        min-height:190px!important;margin-top:18px!important;overflow:hidden!important
      }
      .clientApp .calorieMobileBar{
        display:grid!important;grid-template-rows:22px 132px auto!important;
        gap:8px!important;min-width:0!important;text-align:center!important;color:var(--muted)!important
      }
      .clientApp .calorieMobileBar>span{font-size:11px!important;font-weight:700!important;color:var(--text)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .clientApp .calorieMobileBar>i{position:relative!important;display:flex!important;align-items:flex-end!important;justify-content:center!important;height:132px!important;border-radius:12px!important;background:var(--chart-empty)!important;overflow:hidden!important}
      .clientApp .calorieMobileBar>i>em{display:block!important;width:62%!important;max-width:28px!important;border-radius:8px 8px 4px 4px!important;background:#d6b34f!important;min-height:5px!important}
      .clientApp .calorieMobileBar>i>em.good{background:#86a88e!important}
      .clientApp .calorieMobileBar>i>em.medium{background:#b59a63!important}
      .clientApp .calorieMobileBar>i>em.far{background:#a46e6b!important}
      .clientApp .calorieMobileBar>i>em.empty{background:transparent!important}
      .clientApp .calorieMobileBar>i>b{position:absolute!important;left:0!important;right:0!important;height:1px!important;border-top:1px dashed color-mix(in srgb,var(--chart-line) 75%,transparent)!important}
      .clientApp .calorieMobileBar>small{font-size:11px!important;line-height:1.2!important;color:var(--muted)!important;white-space:normal!important}
      .clientApp .calorieTargetLegend{display:flex!important;align-items:center!important;gap:8px!important;margin-top:14px!important;font-size:12px!important;color:var(--muted)!important}
      .clientApp .calorieTargetLegend>i{width:22px!important;border-top:1px dashed var(--chart-line)!important}
      .clientApp .period30.calorieMobileChart,.clientApp .period90.calorieMobileChart{grid-template-columns:repeat(6,minmax(0,1fr))!important}

      .clientApp .weightChartCompact{margin:8px 0 12px!important;height:132px!important}
      .clientApp .weightChartCompact svg{display:block!important;width:100%!important;height:132px!important;overflow:visible!important}
      .clientApp .weightTrendLine{fill:none!important;stroke:#d4b45d!important;stroke-width:3!important;stroke-linecap:round!important;stroke-linejoin:round!important}
      .clientApp .weightChartCompact circle{fill:#d4b45d!important;stroke:var(--surface)!important;stroke-width:2!important}
      .clientApp .weightChartCompact circle.latest{fill:var(--text)!important}
      .clientApp .weightTargetLine{stroke:color-mix(in srgb,#d4b45d 58%,transparent)!important;stroke-width:1!important;stroke-dasharray:5 5!important}
      .clientApp .weightTargetText{fill:var(--muted)!important;font-size:9px!important}

      /* Home calorie ring and week chart */
      .clientApp .calorieRing,.clientApp .clientCalorieRing{
        filter:none!important;transform:scale(.84)!important;
        background:conic-gradient(#d6b34f var(--progress,0%),var(--chart-empty) 0)!important;
        box-shadow:none!important
      }
      .clientApp .calorieRing::after,.clientApp .clientCalorieRing::after{background:var(--surface)!important}
      .clientApp .weekCaloriesChart,.clientApp .weeklyCalories{overflow:hidden!important}
      .clientApp .weekCaloriesChart>* ,.clientApp .weeklyCalories>*{min-width:0!important}
      :root[data-theme="light"] .clientApp .weekCaloriesChart [class*="bar"],
      :root[data-theme="light"] .clientApp .weeklyCalories [class*="bar"]{
        background:var(--chart-empty)!important;border-color:var(--line)!important
      }
      :root[data-theme="light"] .clientApp .weekCaloriesChart [class*="fill"],
      :root[data-theme="light"] .clientApp .weeklyCalories [class*="fill"]{
        background:linear-gradient(180deg,#e2c465,#b79543)!important
      }

      /* Navigation */
      .clientApp .mobileTopbar{box-shadow:none!important}
      .clientApp .mobileMenuButton,#teddy-theme-toggle{background:var(--surface)!important;border-color:var(--line)!important}
      .clientApp .clientBottomNav{max-width:660px!important;margin:0 auto!important;box-shadow:0 10px 28px rgba(7,20,17,.16)!important}

      @media(max-width:700px){
        .clientApp .content{padding:22px 16px 132px!important}
        .clientApp .pageHead h1,.clientApp .clientWelcome h1{font-size:29px!important}
        .clientApp .planCompareHead{grid-template-columns:1fr!important;gap:12px!important}
        .clientApp .planCol,.clientApp .planGroup,.clientApp .planStatus{padding:18px!important;border-radius:18px!important}
        .clientApp .profileOverview{grid-template-columns:1fr 1fr!important;gap:8px!important}
        .clientApp .progressKeyStats{grid-template-columns:1fr!important}
        .clientApp .calorieMobileChart{gap:5px!important;min-height:164px!important}
        .clientApp .calorieMobileBar{grid-template-rows:18px 108px auto!important;gap:6px!important}
        .clientApp .calorieMobileBar>i{height:108px!important;border-radius:10px!important}
        .clientApp .calorieMobileBar>span{font-size:10px!important}
        .clientApp .calorieMobileBar>small{font-size:10px!important}
        .clientApp .weightChartCompact,.clientApp .weightChartCompact svg{height:112px!important}
        .clientApp .clientBottomNav{left:12px!important;right:12px!important;bottom:max(10px,env(safe-area-inset-bottom))!important;min-height:58px!important;border-radius:19px!important;padding:5px!important}
        .clientApp .clientBottomNav a{font-size:11.5px!important;border-radius:14px!important}
      }
      @media(max-width:430px){
        .clientApp .content{padding-left:13px!important;padding-right:13px!important}
        .clientApp .pageHead h1,.clientApp .clientWelcome h1{font-size:27px!important}
        .clientApp .calorieMobileChart{gap:4px!important}
        .clientApp .calorieMobileBar{grid-template-rows:16px 96px auto!important}
        .clientApp .calorieMobileBar>i{height:96px!important}
        .clientApp .calorieMobileBar>span,.clientApp .calorieMobileBar>small{font-size:9px!important}
      }
    `}</style>
  );
}
