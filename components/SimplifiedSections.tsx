export default function SimplifiedSections() {
  return (
    <style>{`
      .primaryFocus{
        display:grid;
        grid-template-columns:auto minmax(0,1fr) auto;
        align-items:center;
        gap:14px;
        padding:17px 18px;
        margin-bottom:11px;
        border:1px solid var(--gold2);
        border-radius:15px;
        background:linear-gradient(120deg,var(--accent-soft),var(--bg));
      }
      .primaryFocus>i{
        width:40px;
        height:40px;
        display:grid;
        place-items:center;
        border-radius:12px;
        background:var(--accent-soft);
        color:var(--gold);
      }
      .primaryFocus>div{display:grid;min-width:0}
      .primaryFocus small{
        color:var(--gold);
        font-size:12.5px;
        font-weight:800;
        letter-spacing:.09em;
        text-transform:uppercase;
      }
      .primaryFocus b{font-size:16px;margin-top:3px}
      .primaryFocus p{margin:3px 0 0;color:var(--muted);font-size:12.5px;line-height:1.5}
      .primaryFocus>a{
        display:flex;
        align-items:center;
        gap:4px;
        color:var(--gold);
        font-size:12.5px;
        font-weight:750;
        white-space:nowrap;
      }

      .secondaryDisclosure{
        border:1px solid var(--line);
        border-radius:14px;
        background:var(--bg);
        overflow:hidden;
      }
      .secondaryDisclosure>summary{
        list-style:none;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:14px;
        min-height:52px;
        padding:13px 16px;
        cursor:pointer;
        color:var(--muted);
      }
      .secondaryDisclosure>summary::-webkit-details-marker{display:none}
      .secondaryDisclosure>summary>span{display:grid;min-width:0}
      .secondaryDisclosure>summary b{font-size:13px}
      .secondaryDisclosure>summary small{color:var(--muted2);font-size:12.5px;margin-top:2px}
      .secondaryDisclosure>summary svg{color:var(--muted);transition:transform .18s}
      .secondaryDisclosure[open]>summary svg{transform:rotate(180deg)}
      .secondaryDisclosure>.disclosureBody{
        padding:0 16px 16px;
        border-top:1px solid var(--line);
      }

      .profileOverview{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:8px;
        margin-top:11px;
      }
      .profileOverviewItem{
        padding:12px 13px;
        border:1px solid var(--line);
        border-radius:12px;
        background:var(--bg);
      }
      .profileOverviewItem span{display:block;color:var(--muted);font-size:12.5px}
      .profileOverviewItem b{display:block;margin-top:5px;font-size:14px}
      .profileEditor>summary{padding:15px 17px}
      .profileEditor .profileForm{margin-top:16px}
      .profileEditor .disclosureBody{padding-bottom:18px}

      .progressKeyStats{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
        margin-top:10px;
      }
      .progressKeyStat{
        display:flex;
        align-items:center;
        gap:10px;
        padding:13px;
        border:1px solid var(--line);
        border-radius:12px;
        background:var(--bg);
      }
      .progressKeyStat>i{
        width:34px;
        height:34px;
        display:grid;
        place-items:center;
        border-radius:10px;
        border:1px solid var(--line);
        color:var(--gold);
      }
      .progressKeyStat span{display:grid}
      .progressKeyStat small{font-size:12.5px;color:var(--muted)}
      .progressKeyStat b{font-size:15px;margin-top:2px}
      .progressDetails{
        border:0;
        background:transparent;
        overflow:visible;
      }
      .progressDetails>summary{display:none}
      .progressDetails:not([open])>.disclosureBody,
      .progressDetails>.disclosureBody{
        display:flex!important;
        flex-direction:column;
        padding:0;
        border:0;
        background:transparent;
      }
      .progressDetails .clientProgressGrid{
        order:-20;
        margin-top:10px;
      }
      .progressDetails .detailSection{margin-top:10px}
      .progressDetails .clientProgressGrid.detailSection{margin-top:10px}

      .premiumOutcomeGrid{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:9px;
        margin-top:12px;
      }
      .premiumOutcome{
        display:grid;
        gap:6px;
        padding:16px;
        border:1px solid var(--line);
        border-radius:14px;
        background:var(--bg);
      }
      .premiumOutcome>i{
        width:34px;
        height:34px;
        display:grid;
        place-items:center;
        border-radius:10px;
        background:var(--accent-soft);
        color:var(--gold);
      }
      .premiumOutcome b{font-size:13px}
      .premiumOutcome p{margin:0;color:var(--muted2);font-size:13px;line-height:1.5}
      .premiumOffer{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        align-items:center;
        gap:18px;
        border-color:var(--gold2)!important;
        background:linear-gradient(120deg,var(--accent-soft),var(--bg))!important;
      }
      .premiumOffer h2{margin:0 0 5px!important}
      .premiumOffer p{margin:0;color:var(--muted2);font-size:12.5px}
      .premiumOffer strong{display:block;margin-top:9px;font-size:20px}
      .premiumOffer form,.premiumOffer>a{min-width:220px}
      .planCompareGrid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
        padding-top:15px;
      }
      .planCompareCard{
        padding:15px;
        border:1px solid var(--line);
        border-radius:13px;
        background:var(--bg);
      }
      .planCompareCard h3{margin:0;font-size:16px}
      .planCompareCard>p{margin:4px 0 12px;color:var(--muted);font-size:13px}
      .planCompareCard ul{display:grid;gap:7px;margin:0;padding:0;list-style:none}
      .planCompareCard li{display:flex;gap:7px;color:var(--muted);font-size:13px}
      .planCompareCard li svg{flex:none;color:var(--gold)}

      .coachLockedCompact{
        max-width:930px;
        margin:0 auto;
        border:1px solid var(--gold2);
        border-radius:16px;
        background:linear-gradient(120deg,var(--accent-soft),var(--bg));
        overflow:hidden;
      }
      .coachLockedLead{
        display:grid;
        grid-template-columns:auto minmax(0,1fr) auto;
        align-items:center;
        gap:16px;
        padding:22px;
      }
      .coachLockedLead>i{
        width:48px;
        height:48px;
        display:grid;
        place-items:center;
        border-radius:14px;
        background:var(--accent-soft);
        color:var(--gold);
      }
      .coachLockedLead small{
        color:var(--gold);
        font-size:12.5px;
        font-weight:800;
        letter-spacing:.1em;
        text-transform:uppercase;
      }
      .coachLockedLead h2{margin:3px 0 4px;font-size:21px}
      .coachLockedLead p{margin:0;max-width:610px;color:var(--muted);font-size:12.5px;line-height:1.55}
      .coachLockedLead .primary{white-space:nowrap}
      .coachLockedBenefits{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        border-top:1px solid var(--line);
      }
      .coachLockedBenefits>div{
        display:flex;
        align-items:center;
        gap:10px;
        padding:14px 18px;
        border-right:1px solid var(--line);
      }
      .coachLockedBenefits>div:last-child{border-right:0}
      .coachLockedBenefits svg{color:var(--gold);flex:none}
      .coachLockedBenefits span{display:grid}
      .coachLockedBenefits b{font-size:12.5px}
      .coachLockedBenefits small{font-size:12.5px;color:var(--muted);margin-top:2px}
      .coachExtras>.disclosureBody{padding-top:14px}

      .adminPriorityGrid{
        display:grid;
        grid-template-columns:minmax(0,1.4fr) minmax(280px,.6fr);
        gap:10px;
        align-items:start;
      }
      .adminKpisCompact{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      .adminActionList{display:grid;gap:7px;margin-top:12px}
      .adminAction{
        display:grid;
        grid-template-columns:auto minmax(0,1fr) auto;
        gap:10px;
        align-items:center;
        padding:11px 12px;
        border:1px solid var(--line);
        border-radius:11px;
        background:var(--bg);
      }
      .adminAction>i{
        width:32px;
        height:32px;
        display:grid;
        place-items:center;
        border-radius:9px;
        border:1px solid var(--line);
        color:var(--gold);
      }
      .adminAction span{display:grid}
      .adminAction b{font-size:12.5px}
      .adminAction small{font-size:12.5px;color:var(--muted);margin-top:2px}
      .adminAction>strong{font-size:13px;color:var(--gold)}
      .adminToolsGrid{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:10px;
      }
      .adminToolGroup{padding:16px}
      .adminToolGroup h2{margin:0 0 11px!important;font-size:14px!important}
      .adminToolLinks{display:grid}
      .adminToolLink{
        display:grid;
        grid-template-columns:auto minmax(0,1fr) auto;
        gap:10px;
        align-items:center;
        padding:11px 0;
        border-bottom:1px solid var(--line);
      }
      .adminToolLink:last-child{border-bottom:0}
      .adminToolLink>i{
        width:30px;
        height:30px;
        display:grid;
        place-items:center;
        border:1px solid var(--line);
        border-radius:9px;
        color:var(--gold);
      }
      .adminToolLink span{display:grid}
      .adminToolLink b{font-size:12.5px}
      .adminToolLink small{font-size:12.5px;color:var(--muted);margin-top:2px}
      .adminToolLink>em{font-style:normal;color:var(--muted2);font-size:14px}

      .emptyGuidance{
        min-height:150px;
        display:grid;
        place-items:center;
        align-content:center;
        gap:6px;
        text-align:center;
        color:var(--muted);
      }
      .emptyGuidance svg{color:var(--gold)}
      .emptyGuidance b{color:var(--text);font-size:14px}
      .emptyGuidance span{max-width:420px;font-size:13px;line-height:1.5}

      @media(max-width:1000px){
        .adminToolsGrid{grid-template-columns:1fr 1fr}
      }
      @media(max-width:900px){
        .profileOverview{grid-template-columns:1fr 1fr}
        .premiumOutcomeGrid{grid-template-columns:1fr}
        .adminPriorityGrid{grid-template-columns:1fr}
        .coachLockedLead{grid-template-columns:auto 1fr}
        .coachLockedLead .primary{grid-column:2;justify-self:start}
      }
      @media(max-width:650px){
        .primaryFocus{grid-template-columns:auto 1fr;padding:14px}
        .primaryFocus>a{grid-column:2}
        .progressKeyStats{grid-template-columns:1fr}
        .premiumOffer{grid-template-columns:1fr}
        .premiumOffer form,.premiumOffer>a{min-width:0;width:100%}
        .planCompareGrid{grid-template-columns:1fr}
        .coachLockedLead{grid-template-columns:1fr;text-align:left;padding:18px}
        .coachLockedLead .primary{grid-column:1;width:100%;justify-content:center}
        .coachLockedBenefits{grid-template-columns:1fr}
        .coachLockedBenefits>div{border-right:0;border-bottom:1px solid var(--line)}
        .coachLockedBenefits>div:last-child{border-bottom:0}
        .adminKpisCompact{grid-template-columns:1fr!important}
        .adminToolsGrid{grid-template-columns:1fr}
      }
      @media(max-width:430px){
        .profileOverview{grid-template-columns:1fr}
      }
    `}</style>
  );
}
