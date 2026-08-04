export default function ClientDesignV3() {
  return (
    <style>{`
      /* TeddY client design v3.4 */
      .clientApp{--client-radius-lg:20px;--client-radius-md:14px}
      :root[data-theme="light"] .clientApp{
        --surface:#ffffff;--surface-soft:#f2f6f3;--panel:#f7faf8;
        --line:#cedbd4;--line2:#b9cbc2;--text:#173a32;
        --muted:#526a63;--muted2:#657a73;--accent-soft:#f6eedb;
        --chart-empty:#e4ebe7;--chart-line:#a88a35;
        --shadow:0 10px 26px rgba(28,55,47,.08)
      }
      :root[data-theme="dark"] .clientApp{
        --surface:#111a18;--surface-soft:#16211f;--panel:#0d1614;
        --line:#293936;--line2:#3a4c48;--text:#f0f4f2;
        --muted:#a6b5b0;--muted2:#8fa19b;--accent-soft:#242117;
        --chart-empty:#202a28;--chart-line:#d6b34f;
        --shadow:0 12px 30px rgba(0,0,0,.24)
      }

      .clientApp .content{display:block;max-width:980px!important}
      .clientApp .pageHead h1,.clientApp .clientWelcome h1{color:var(--text)!important;font-weight:790;letter-spacing:-1px;line-height:1.07}
      .clientApp .pageHead span,.clientApp .clientWelcome span,.clientApp .muted{color:var(--muted)!important}

      .clientApp .card,.clientApp .primaryFocus,.clientApp .todayNutritionCard,
      .clientApp .nextMealCard,.clientApp .coachHome,.clientApp .recentMealsCompact,
      .clientApp .calmSignals,.clientApp .planStatus,.clientApp .trialCta,
      .clientApp .progressNarrative,.clientApp .goalJourney,.clientApp .coachDecision,
      .clientApp .clientProfileHero,.clientApp .profileOverviewItem,.clientApp .profileHub>a,
      .clientApp .secondaryDisclosure,.clientApp .progressKeyStat,.clientApp .macroSummaryCard,
      .clientApp .coachSituations>a,.clientApp .visualMealSession,.clientApp .visualMealItem,
      .clientApp .smartMealCard,.clientApp .clientMealList,.clientApp .clientTimelineCard,
      .clientApp .clientCoachSummary,.clientApp .clientCoachPanel,.clientApp .periodSwitch,
      .clientApp .planCol,.clientApp .planGroup,.clientApp .clientMealDay,.clientApp .mealDayCard{
        background:var(--surface)!important;border:1px solid var(--line)!important;
        color:var(--text)!important;box-shadow:var(--shadow)!important
      }
      .clientApp .visualMealItem,.clientApp .mealSessionCard,.clientApp .mealRow,
      .clientApp .coachHomeGrid article,.clientApp .clientMealDay article{
        background:var(--surface-soft)!important;border-color:var(--line)!important
      }
      .clientApp h1,.clientApp h2,.clientApp h3,.clientApp b,.clientApp strong{color:var(--text)!important}
      .clientApp p,.clientApp small,.clientApp label,.clientApp .planRowName small,
      .clientApp .lvl span,.clientApp .profileOverviewItem span,.clientApp .profileHub small,
      .clientApp .coachHomeGrid p,.clientApp .coachDecision p,.clientApp .clientCoachPanel p,
      .clientApp .clientCoachSummary p{color:var(--muted)!important;opacity:1!important}
      :root[data-theme="light"] .clientApp input,
      :root[data-theme="light"] .clientApp textarea,
      :root[data-theme="light"] .clientApp select{color:#244941!important;background:#f8fbf9!important;border-color:var(--line)!important}

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
      .clientApp .weightProgressCard .sectionTitleRow>svg{width:18px!important;height:18px!important;max-width:18px!important;max-height:18px!important;opacity:.65}
      .clientApp .weightChart svg,.clientApp .weightTrendChart svg{width:100%!important;max-width:100%!important;height:auto!important;max-height:190px!important}
      .clientApp .weightHistory{margin-top:8px!important}
      .clientApp .periodBarChart{display:flex!important;width:100%!important;min-width:0!important;height:166px!important;gap:3px!important;overflow:hidden!important}
      .clientApp .periodBar{flex:1 1 0!important;min-width:0!important;height:154px!important;grid-template-rows:14px 1fr 17px!important}
      .clientApp .periodBar>div{height:118px!important;background:var(--chart-empty)!important;border-radius:8px!important;overflow:hidden!important}
      .clientApp .periodBar>div i{width:64%!important;max-width:16px!important;border-radius:6px 6px 3px 3px!important}
      .clientApp .periodBar>div em{border-color:var(--chart-line)!important;opacity:.75!important}
      .clientApp .periodBar>span{display:none!important}
      .clientApp .periodBar>small{color:var(--muted)!important;font-size:9px!important;white-space:nowrap!important;overflow:hidden!important}
      .clientApp .macroSummaryGrid{grid-template-columns:1fr!important}
      .clientApp .macroSummaryCard{padding:16px!important;border-radius:14px!important}

      /* Calorie ring + weekly chart */
      .clientApp .calorieRing,.clientApp .clientCalorieRing{
        filter:none!important;transform:scale(.84)!important;
        background:conic-gradient(#d6b34f var(--progress,0%),var(--chart-empty) 0)!important;
        box-shadow:none!important
      }
      .clientApp .calorieRing::after,.clientApp .clientCalorieRing::after{background:var(--surface)!important}
      .clientApp .weekCaloriesChart,.clientApp .weeklyCalories{overflow:hidden!important}
      .clientApp .weekCaloriesChart>* ,.clientApp .weeklyCalories>*{min-width:0!important}
      :root[data-theme="light"] .clientApp .weekCaloriesChart [class*="empty"],
      :root[data-theme="light"] .clientApp .weeklyCalories [class*="empty"]{background:var(--chart-empty)!important}
      :root[data-theme="light"] .clientApp .weekCaloriesChart [class*="bar"],
      :root[data-theme="light"] .clientApp .weeklyCalories [class*="bar"]{border-color:var(--line)!important}

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
        .clientApp .periodBarChart{height:144px!important;gap:2px!important}
        .clientApp .periodBar{height:134px!important;grid-template-rows:10px 1fr 16px!important}
        .clientApp .periodBar>div{height:104px!important}
        .clientApp .periodBar>div i{max-width:13px!important}
        .clientApp .weightChart svg,.clientApp .weightTrendChart svg{max-height:165px!important}
        .clientApp .clientBottomNav{left:12px!important;right:12px!important;bottom:max(10px,env(safe-area-inset-bottom))!important;min-height:58px!important;border-radius:19px!important;padding:5px!important}
        .clientApp .clientBottomNav a{font-size:11.5px!important;border-radius:14px!important}
      }
      @media(max-width:430px){
        .clientApp .content{padding-left:13px!important;padding-right:13px!important}
        .clientApp .pageHead h1,.clientApp .clientWelcome h1{font-size:27px!important}
        .clientApp .periodBarChart{height:132px!important}
        .clientApp .periodBar{height:122px!important}
        .clientApp .periodBar>div{height:93px!important}
        .clientApp .periodBar>small{font-size:8px!important}
      }
    `}</style>
  );
}
