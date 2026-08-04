export default function MichelinSections() {
  return (
    <style>{`
      .todayNutritionCard{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(360px,1.2fr);gap:18px;padding:19px;border:1px solid var(--line);border-radius:15px;background:var(--bg)}
      .todayNumbers small{display:block;color:#777;font-size:12.5px;text-transform:uppercase;letter-spacing:.08em}
      .todayNumbers>b{display:block;margin-top:6px;font-size:28px;letter-spacing:-.8px}
      .todayNumbers>b em{font-style:normal;font-size:13px;color:#777;font-weight:500}
      .todayNumbers p{margin:5px 0 0;color:var(--muted);font-size:12.5px}
      .todayMacros{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .todayMacros>div{padding:12px;border:1px solid var(--line);border-radius:11px;background:var(--bg)}
      .todayMacros span,.todayMacros small{display:block;color:#777;font-size:12.5px}
      .todayMacros b{display:block;margin:4px 0 2px;font-size:14px}
      .todayMacros i{display:block;height:4px;margin-top:9px;border-radius:999px;background:var(--panel2);overflow:hidden}
      .todayMacros em{display:block;height:100%;border-radius:999px;background:var(--gold)}
      .todayActions{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:14px;padding-top:2px}
      .todayActions .primary{min-width:240px;text-align:center}
      .todayActions>span{display:flex;gap:16px;flex-wrap:wrap}
      .todayActions>span a{color:var(--muted);font-size:13px}
      .nextMealCard{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;padding:14px 16px;border:1px solid var(--line);border-radius:13px;background:var(--bg)}
      .nextMealCard>i{width:36px;height:36px;display:grid;place-items:center;border:1px solid var(--line);border-radius:10px;color:var(--muted)}
      .nextMealCard small{display:block;color:#777;font-size:12.5px}
      .nextMealCard b{display:block;margin-top:3px;font-size:13px}
      .nextMealCard p{margin:3px 0 0;color:var(--muted2);font-size:13px}
      .calmSignals h2{margin-bottom:0!important}
      .signalList{display:grid;margin-top:10px}
      .signalRow{display:grid;grid-template-columns:auto 1fr;gap:10px;padding:11px 0;border-bottom:1px solid var(--line)}
      .signalRow:last-child{border-bottom:0}
      .signalRow>i{width:31px;height:31px;display:grid;place-items:center;border:1px solid var(--line);border-radius:9px;color:#888}
      .signalRow.warn>i{color:#c89b67}.signalRow.good>i{color:var(--muted)}
      .signalRow span{display:grid}.signalRow b{font-size:12.5px}.signalRow small{margin-top:2px;color:#777;font-size:12.5px;line-height:1.45}
      .coachHome{border-color:var(--gold2)!important;background:var(--bg)!important}
      .coachHomeGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:13px}
      .coachHomeGrid article{padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
      .coachHomeGrid small{display:block;color:var(--gold);font-size:12.5px;text-transform:uppercase;letter-spacing:.07em}
      .coachHomeGrid b{display:block;margin-top:4px;font-size:13px}.coachHomeGrid p{margin:6px 0 0;color:var(--muted);font-size:13px;line-height:1.55;white-space:pre-wrap}
      .coachHomeLink{display:inline-flex;margin-top:11px}
      .premiumQuietInvite,.allToolsQuiet,.criticalSystemBanner,.healthySystemBanner{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:11px;padding:13px 15px;border:1px solid var(--line);border-radius:13px;background:var(--bg)}
      .premiumQuietInvite>svg,.allToolsQuiet>svg{color:var(--muted2)}
      .premiumQuietInvite span,.allToolsQuiet span,.criticalSystemBanner span,.healthySystemBanner span{display:grid}
      .premiumQuietInvite b,.allToolsQuiet b,.criticalSystemBanner b,.healthySystemBanner b{font-size:12.5px}
      .premiumQuietInvite small,.allToolsQuiet small,.criticalSystemBanner small,.healthySystemBanner small{margin-top:2px;color:#777;font-size:12.5px}
      .premiumQuietInvite strong{color:var(--muted);font-size:13px}
      .recentMealsCompact .emptyGuidance{min-height:130px}

      .periodSwitch{display:inline-flex;gap:4px;padding:4px;border:1px solid var(--line);border-radius:11px;background:var(--bg)}
      .periodSwitch a{padding:7px 12px;border-radius:8px;color:#777;font-size:13px;font-weight:700}
      .periodSwitch a.active{background:var(--surface);color:var(--text)}
      .progressNarrative{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;padding:16px 17px;border:1px solid var(--line);border-radius:14px;background:var(--bg)}
      .progressNarrative>i{width:37px;height:37px;display:grid;place-items:center;border:1px solid var(--line);border-radius:10px;color:var(--muted)}
      .progressNarrative small{display:block;color:#777;font-size:12.5px;text-transform:uppercase;letter-spacing:.08em}
      .progressNarrative b{display:block;margin-top:3px;font-size:15px}.progressNarrative p{margin:5px 0 0;color:var(--muted);font-size:12.5px;line-height:1.5}.progressNarrative span{display:block;margin-top:5px;color:var(--muted2);font-size:12.5px}
      .goalJourney{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:15px 16px 20px;border:1px solid var(--line);border-radius:13px;background:var(--bg);overflow:hidden}
      .goalJourney small{display:block;color:#777;font-size:12.5px}.goalJourney b{display:flex;align-items:center;gap:7px;margin-top:4px;font-size:15px}.goalJourney p{margin:4px 0 0;color:#777;font-size:12.5px}
      .goalJourney>strong{font-size:20px;color:var(--muted)}.goalJourney>i{position:absolute;left:0;right:0;bottom:0;height:5px;background:var(--panel2)}.goalJourney>i em{display:block;height:100%;background:var(--gold)}
      .progressCharts{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(290px,.55fr);gap:10px}
      .periodBarChart{height:230px;display:flex;align-items:end;gap:5px;margin-top:15px;overflow-x:auto;padding-bottom:3px}
      .periodBar{flex:1 0 24px;min-width:18px;height:205px;display:grid;grid-template-rows:22px 1fr 18px;text-align:center;align-items:end}
      .period90 .periodBar{flex-basis:42px}.periodBar>span{font-size:12.5px;color:var(--muted2)}
      .periodBar>div{position:relative;height:160px;display:flex;justify-content:center;align-items:flex-end;border-bottom:1px solid var(--line)}
      .periodBar>div i{width:64%;max-width:24px;min-height:2px;border-radius:5px 5px 1px 1px;background:#676a67}
      .periodBar>div i.good{background:#8ca890}.periodBar>div i.medium{background:var(--gold)}.periodBar>div i.far{background:var(--red)}
      .periodBar>div em{position:absolute;left:0;right:0;border-top:1px dashed var(--line2)}.periodBar>small{font-size:12.5px;color:var(--muted2);padding-top:4px}
      .macroSummaryGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:13px}
      .macroSummaryCard{padding:13px;border:1px solid var(--line);border-radius:11px;background:var(--bg)}
      .macroSummaryCard span,.macroSummaryCard small,.macroSummaryCard em{display:block}.macroSummaryCard span{color:#777;font-size:12.5px}.macroSummaryCard b{margin-top:5px;font-size:16px}
      .macroSummaryCard small{margin-top:2px;color:#777;font-size:12.5px}.macroSummaryCard em{margin-top:7px;color:var(--muted);font-size:12.5px;font-style:normal}

      .profileHub{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .profileHub>a{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:13px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
      .profileHub>a>i{width:33px;height:33px;display:grid;place-items:center;border:1px solid var(--line);border-radius:9px;color:var(--muted)}
      .profileHub span{display:grid}.profileHub b{font-size:12.5px}.profileHub small{margin-top:2px;color:#777;font-size:12.5px}.profileHub>a>svg{color:#666}

      .coachDecision{display:grid;grid-template-columns:auto 1fr;gap:13px;align-items:center;padding:17px;border:1px solid var(--line);border-radius:14px;background:var(--bg)}
      .coachDecision>i{width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--line);border-radius:12px;color:var(--gold)}
      .coachDecision small{display:block;color:var(--gold);font-size:12.5px;text-transform:uppercase;letter-spacing:.08em}.coachDecision h2{margin:4px 0 3px;font-size:18px}.coachDecision p{margin:0;color:var(--muted2);font-size:13px}
      .coachWorkGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.coachText{color:var(--muted);font-size:12.5px;line-height:1.65;white-space:pre-wrap}
      .coachFeedback{display:grid;grid-template-columns:auto minmax(180px,1fr) auto;gap:8px;margin-top:12px}.coachCheckin{grid-template-columns:repeat(3,minmax(0,1fr))}.coachCheckin textarea,.coachCheckin button{grid-column:1/-1}
      .coachSituations{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .coachSituations>a{display:grid;grid-template-columns:1fr auto;align-items:center;gap:10px;padding:13px;border:1px solid var(--line);border-radius:11px;background:var(--bg)}
      .coachSituations span{display:grid}.coachSituations b{font-size:12.5px}.coachSituations small{margin-top:2px;color:#777;font-size:12.5px}.coachSituations svg{color:#666}

      .adminMichelinKpis{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      .criticalSystemBanner{border-color:var(--red);background:var(--red)}.criticalSystemBanner>svg{color:var(--red)}
      .healthySystemBanner{grid-template-columns:auto 1fr;border-color:var(--line);background:var(--surface-soft)}.healthySystemBanner>svg{color:var(--green)}
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
