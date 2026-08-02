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
        border:1px solid #403821;
        border-radius:15px;
        background:linear-gradient(120deg,#17150f,#111216);
      }
      .primaryFocus>i{
        width:40px;
        height:40px;
        display:grid;
        place-items:center;
        border-radius:12px;
        background:#242015;
        color:var(--gold);
      }
      .primaryFocus>div{display:grid;min-width:0}
      .primaryFocus small{
        color:#8f7c49;
        font-size:9px;
        font-weight:800;
        letter-spacing:.09em;
        text-transform:uppercase;
      }
      .primaryFocus b{font-size:16px;margin-top:3px}
      .primaryFocus p{margin:3px 0 0;color:#9b9d99;font-size:11px;line-height:1.5}
      .primaryFocus>a{
        display:flex;
        align-items:center;
        gap:4px;
        color:var(--gold);
        font-size:11px;
        font-weight:750;
        white-space:nowrap;
      }

      .secondaryDisclosure{
        border:1px solid #25272c;
        border-radius:14px;
        background:#0e0f12;
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
        color:#c8cac6;
      }
      .secondaryDisclosure>summary::-webkit-details-marker{display:none}
      .secondaryDisclosure>summary>span{display:grid;min-width:0}
      .secondaryDisclosure>summary b{font-size:13px}
      .secondaryDisclosure>summary small{color:#737673;font-size:9px;margin-top:2px}
      .secondaryDisclosure>summary svg{color:#777;transition:transform .18s}
      .secondaryDisclosure[open]>summary svg{transform:rotate(180deg)}
      .secondaryDisclosure>.disclosureBody{
        padding:0 16px 16px;
        border-top:1px solid #22242a;
      }

      .profileOverview{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:8px;
        margin-top:11px;
      }
      .profileOverviewItem{
        padding:12px 13px;
        border:1px solid #25272c;
        border-radius:12px;
        background:#0e0f12;
      }
      .profileOverviewItem span{display:block;color:#777;font-size:9px}
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
        border:1px solid #25272c;
        border-radius:12px;
        background:#0e0f12;
      }
      .progressKeyStat>i{
        width:34px;
        height:34px;
        display:grid;
        place-items:center;
        border-radius:10px;
        border:1px solid #2c2e33;
        color:var(--gold);
      }
      .progressKeyStat span{display:grid}
      .progressKeyStat small{font-size:9px;color:#777}
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
        border:1px solid #2b2d32;
        border-radius:14px;
        background:#101115;
      }
      .premiumOutcome>i{
        width:34px;
        height:34px;
        display:grid;
        place-items:center;
        border-radius:10px;
        background:#1f1b12;
        color:var(--gold);
      }
      .premiumOutcome b{font-size:13px}
      .premiumOutcome p{margin:0;color:#858885;font-size:10px;line-height:1.5}
      .premiumOffer{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        align-items:center;
        gap:18px;
        border-color:#4b4127!important;
        background:linear-gradient(120deg,#17150f,#111216)!important;
      }
      .premiumOffer h2{margin:0 0 5px!important}
      .premiumOffer p{margin:0;color:#898c88;font-size:11px}
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
        border:1px solid #27292e;
        border-radius:13px;
        background:#101115;
      }
      .planCompareCard h3{margin:0;font-size:16px}
      .planCompareCard>p{margin:4px 0 12px;color:#777;font-size:10px}
      .planCompareCard ul{display:grid;gap:7px;margin:0;padding:0;list-style:none}
      .planCompareCard li{display:flex;gap:7px;color:#bfc1bd;font-size:10px}
      .planCompareCard li svg{flex:none;color:#cbb05e}

      .coachLockedCompact{
        max-width:930px;
        margin:0 auto;
        border:1px solid #413821;
        border-radius:16px;
        background:linear-gradient(120deg,#15140f,#101114);
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
        background:#231f14;
        color:var(--gold);
      }
      .coachLockedLead small{
        color:#9c864d;
        font-size:9px;
        font-weight:800;
        letter-spacing:.1em;
        text-transform:uppercase;
      }
      .coachLockedLead h2{margin:3px 0 4px;font-size:21px}
      .coachLockedLead p{margin:0;max-width:610px;color:#8b8e8a;font-size:11px;line-height:1.55}
      .coachLockedLead .primary{white-space:nowrap}
      .coachLockedBenefits{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        border-top:1px solid #2c2a22;
      }
      .coachLockedBenefits>div{
        display:flex;
        align-items:center;
        gap:10px;
        padding:14px 18px;
        border-right:1px solid #292922;
      }
      .coachLockedBenefits>div:last-child{border-right:0}
      .coachLockedBenefits svg{color:#c9aa57;flex:none}
      .coachLockedBenefits span{display:grid}
      .coachLockedBenefits b{font-size:11px}
      .coachLockedBenefits small{font-size:9px;color:#777;margin-top:2px}
      .coachExtras>.disclosureBody{padding-top:14px}

      .adminApp .desktopNav .navSection:nth-child(n+2){display:none}
      .adminApp .mobileDrawerNav section:nth-child(n+2){display:none}
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
        border:1px solid #25272c;
        border-radius:11px;
        background:#0e0f12;
      }
      .adminAction>i{
        width:32px;
        height:32px;
        display:grid;
        place-items:center;
        border-radius:9px;
        border:1px solid #2b2d32;
        color:var(--gold);
      }
      .adminAction span{display:grid}
      .adminAction b{font-size:11px}
      .adminAction small{font-size:9px;color:#777;margin-top:2px}
      .adminAction>strong{font-size:13px;color:#d5bc70}
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
        border-bottom:1px solid #22242a;
      }
      .adminToolLink:last-child{border-bottom:0}
      .adminToolLink>i{
        width:30px;
        height:30px;
        display:grid;
        place-items:center;
        border:1px solid #2b2d32;
        border-radius:9px;
        color:var(--gold);
      }
      .adminToolLink span{display:grid}
      .adminToolLink b{font-size:11px}
      .adminToolLink small{font-size:9px;color:#777;margin-top:2px}
      .adminToolLink>em{font-style:normal;color:#686b68;font-size:14px}

      .emptyGuidance{
        min-height:150px;
        display:grid;
        place-items:center;
        align-content:center;
        gap:6px;
        text-align:center;
        color:#777;
      }
      .emptyGuidance svg{color:var(--gold)}
      .emptyGuidance b{color:#d7d8d4;font-size:14px}
      .emptyGuidance span{max-width:420px;font-size:10px;line-height:1.5}

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
        .coachLockedBenefits>div{border-right:0;border-bottom:1px solid #292922}
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
