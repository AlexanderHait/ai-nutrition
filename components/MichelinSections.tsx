export default function MichelinSections() {
  return (
    <style>{`
      .todayNutritionCard{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(360px,1.2fr);gap:18px;padding:19px;border:1px solid #27292e;border-radius:15px;background:#111216}
      .todayNumbers small{display:block;color:#777;font-size:12.5px;text-transform:uppercase;letter-spacing:.08em}
      .todayNumbers>b{display:block;margin-top:6px;font-size:28px;letter-spacing:-.8px}
      .todayNumbers>b em{font-style:normal;font-size:13px;color:#777;font-weight:500}
      .todayNumbers p{margin:5px 0 0;color:#a6a8a4;font-size:12.5px}
      .todayMacros{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .todayMacros>div{padding:12px;border:1px solid #24262b;border-radius:11px;background:#0e0f12}
      .todayMacros span,.todayMacros small{display:block;color:#777;font-size:12.5px}
      .todayMacros b{display:block;margin:4px 0 2px;font-size:14px}
      .todayMacros i{display:block;height:4px;margin-top:9px;border-radius:999px;background:#25272c;overflow:hidden}
      .todayMacros em{display:block;height:100%;border-radius:999px;background:#c6ab5d}
      .todayActions{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:14px;padding-top:2px}
      .todayActions .primary{min-width:240px;text-align:center}
      .todayActions>span{display:flex;gap:16px;flex-wrap:wrap}
      .todayActions>span a{color:#949793;font-size:13px}
      .nextMealCard{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;padding:14px 16px;border:1px solid #282a2f;border-radius:13px;background:#0f1013}
      .nextMealCard>i{width:36px;height:36px;display:grid;place-items:center;border:1px solid #2a2c31;border-radius:10px;color:#9ea09c}
      .nextMealCard small{display:block;color:#777;font-size:12.5px}
      .nextMealCard b{display:block;margin-top:3px;font-size:13px}
      .nextMealCard p{margin:3px 0 0;color:#858885;font-size:13px}
      .calmSignals h2{margin-bottom:0!important}
      .signalList{display:grid;margin-top:10px}
      .signalRow{display:grid;grid-template-columns:auto 1fr;gap:10px;padding:11px 0;border-bottom:1px solid #22242a}
      .signalRow:last-child{border-bottom:0}
      .signalRow>i{width:31px;height:31px;display:grid;place-items:center;border:1px solid #292c31;border-radius:9px;color:#888}
      .signalRow.warn>i{color:#c89b67}.signalRow.good>i{color:#7fa98a}
      .signalRow span{display:grid}.signalRow b{font-size:12.5px}.signalRow small{margin-top:2px;color:#777;font-size:12.5px;line-height:1.45}
      .coachHome{border-color:#373328!important;background:#12130f!important}
      .coachHomeGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:13px}
      .coachHomeGrid article{padding:14px;border:1px solid #292a27;border-radius:12px;background:#0e0f11}
      .coachHomeGrid small{display:block;color:#83754f;font-size:12.5px;text-transform:uppercase;letter-spacing:.07em}
      .coachHomeGrid b{display:block;margin-top:4px;font-size:13px}.coachHomeGrid p{margin:6px 0 0;color:#8c8f8b;font-size:13px;line-height:1.55;white-space:pre-wrap}
      .coachHomeLink{display:inline-flex;margin-top:11px}
      .premiumQuietInvite,.allToolsQuiet,.criticalSystemBanner,.healthySystemBanner{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:11px;padding:13px 15px;border:1px solid #292b30;border-radius:13px;background:#0f1013}
      .premiumQuietInvite>svg,.allToolsQuiet>svg{color:#898c88}
      .premiumQuietInvite span,.allToolsQuiet span,.criticalSystemBanner span,.healthySystemBanner span{display:grid}
      .premiumQuietInvite b,.allToolsQuiet b,.criticalSystemBanner b,.healthySystemBanner b{font-size:12.5px}
      .premiumQuietInvite small,.allToolsQuiet small,.criticalSystemBanner small,.healthySystemBanner small{margin-top:2px;color:#777;font-size:12.5px}
      .premiumQuietInvite strong{color:#9b9d99;font-size:13px}
      .recentMealsCompact .emptyGuidance{min-height:130px}

      .periodSwitch{display:inline-flex;gap:4px;padding:4px;border:1px solid #25272c;border-radius:11px;background:#0e0f12}
      .periodSwitch a{padding:7px 12px;border-radius:8px;color:#777;font-size:13px;font-weight:700}
      .periodSwitch a.active{background:#1b1c20;color:#ecece7}
      .progressNarrative{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;padding:16px 17px;border:1px solid #2a2c31;border-radius:14px;background:#111216}
      .progressNarrative>i{width:37px;height:37px;display:grid;place-items:center;border:1px solid #2d2f34;border-radius:10px;color:#a6a8a4}
      .progressNarrative small{display:block;color:#777;font-size:12.5px;text-transform:uppercase;letter-spacing:.08em}
      .progressNarrative b{display:block;margin-top:3px;font-size:15px}.progressNarrative p{margin:5px 0 0;color:#9a9d99;font-size:12.5px;line-height:1.5}.progressNarrative span{display:block;margin-top:5px;color:#737673;font-size:12.5px}
      .goalJourney{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:15px 16px 20px;border:1px solid #282a2f;border-radius:13px;background:#0e0f12;overflow:hidden}
      .goalJourney small{display:block;color:#777;font-size:12.5px}.goalJourney b{display:flex;align-items:center;gap:7px;margin-top:4px;font-size:15px}.goalJourney p{margin:4px 0 0;color:#777;font-size:12.5px}
      .goalJourney>strong{font-size:20px;color:#c6c8c3}.goalJourney>i{position:absolute;left:0;right:0;bottom:0;height:5px;background:#24262b}.goalJourney>i em{display:block;height:100%;background:#c4aa60}
      .progressCharts{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(290px,.55fr);gap:10px}
      .periodBarChart{height:230px;display:flex;align-items:end;gap:5px;margin-top:15px;overflow-x:auto;padding-bottom:3px}
      .periodBar{flex:1 0 24px;min-width:18px;height:205px;display:grid;grid-template-rows:22px 1fr 18px;text-align:center;align-items:end}
      .period90 .periodBar{flex-basis:42px}.periodBar>span{font-size:12.5px;color:#6f7270}
      .periodBar>div{position:relative;height:160px;display:flex;justify-content:center;align-items:flex-end;border-bottom:1px solid #292b30}
      .periodBar>div i{width:64%;max-width:24px;min-height:2px;border-radius:5px 5px 1px 1px;background:#676a67}
      .periodBar>div i.good{background:#8ca890}.periodBar>div i.medium{background:#b09463}.periodBar>div i.far{background:#9e6b6b}
      .periodBar>div em{position:absolute;left:0;right:0;border-top:1px dashed #575249}.periodBar>small{font-size:12.5px;color:#6d706d;padding-top:4px}
      .macroSummaryGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:13px}
      .macroSummaryCard{padding:13px;border:1px solid #25272c;border-radius:11px;background:#0e0f12}
      .macroSummaryCard span,.macroSummaryCard small,.macroSummaryCard em{display:block}.macroSummaryCard span{color:#777;font-size:12.5px}.macroSummaryCard b{margin-top:5px;font-size:16px}
      .macroSummaryCard small{margin-top:2px;color:#777;font-size:12.5px}.macroSummaryCard em{margin-top:7px;color:#9a9d99;font-size:12.5px;font-style:normal}

      .profileHub{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .profileHub>a{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:13px;border:1px solid #25272c;border-radius:12px;background:#0e0f12}
      .profileHub>a>i{width:33px;height:33px;display:grid;place-items:center;border:1px solid #2a2c31;border-radius:9px;color:#8e918d}
      .profileHub span{display:grid}.profileHub b{font-size:12.5px}.profileHub small{margin-top:2px;color:#777;font-size:12.5px}.profileHub>a>svg{color:#666}

      .coachDecision{display:grid;grid-template-columns:auto 1fr;gap:13px;align-items:center;padding:17px;border:1px solid #32302a;border-radius:14px;background:#12130f}
      .coachDecision>i{width:42px;height:42px;display:grid;place-items:center;border:1px solid #343129;border-radius:12px;color:#b69c58}
      .coachDecision small{display:block;color:#84764f;font-size:12.5px;text-transform:uppercase;letter-spacing:.08em}.coachDecision h2{margin:4px 0 3px;font-size:18px}.coachDecision p{margin:0;color:#858885;font-size:13px}
      .coachWorkGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.coachText{color:#b8bab6;font-size:12.5px;line-height:1.65;white-space:pre-wrap}
      .coachFeedback{display:grid;grid-template-columns:auto minmax(180px,1fr) auto;gap:8px;margin-top:12px}.coachCheckin{grid-template-columns:repeat(3,minmax(0,1fr))}.coachCheckin textarea,.coachCheckin button{grid-column:1/-1}
      .coachSituations{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .coachSituations>a{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;padding:13px;border:1px solid #25272c;border-radius:11px;background:#0e0f12}
      .coachSituations span{display:grid}.coachSituations b{font-size:12.5px}.coachSituations small{margin-top:2px;color:#777;font-size:12.5px}.coachSituations svg{color:#666}

      .adminMichelinKpis{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      .criticalSystemBanner{border-color:#55353a;background:#171012}.criticalSystemBanner>svg{color:#d17a7a}
      .healthySystemBanner{grid-template-columns:auto 1fr;border-color:#29352d;background:#101512}.healthySystemBanner>svg{color:#78a985}
      .allToolsQuiet{margin-top:10px}.timelineInsideNutrition{max-height:720px;overflow:auto}

      @media(max-width:1000px){.progressCharts{grid-template-columns:1fr}.todayNutritionCard{grid-template-columns:1fr}.todayActions{grid-column:1}}
      @media(max-width:900px){.profileHub{grid-template-columns:1fr}.coachWorkGrid{grid-template-columns:1fr}.coachSituations{grid-template-columns:1fr}.adminMichelinKpis{grid-template-columns:1fr 1fr!important}}
      @media(max-width:650px){
        .todayMacros{grid-template-columns:1fr}.todayActions{display:grid}.todayActions .primary{min-width:0;width:100%}.todayActions>span{justify-content:space-between}
        .coachHomeGrid{grid-template-columns:1fr}.macroSummaryGrid{grid-template-columns:1fr}.coachFeedback{grid-template-columns:1fr}.coachCheckin{grid-template-columns:1fr}.coachCheckin textarea,.coachCheckin button{grid-column:1}
      }
      @media(max-width:430px){.adminMichelinKpis{grid-template-columns:1fr!important}.periodSwitch{display:grid;grid-template-columns:repeat(3,1fr)}.periodSwitch a{text-align:center}}
    `}</style>
  );
}
