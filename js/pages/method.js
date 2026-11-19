/* Method */
(function () {
  const { D, esc } = ST;
  function render(app) {
    const m = D.meta;
    app.innerHTML = `<div class="wrap">
      <header class="page-head">
        <span class="kicker">Method</span>
        <h1>How SolarTrace knows what it knows</h1>
        <p class="sub">An investigation is only as good as its rules. These are ours.</p>
      </header>

      <section>
        <div class="pipeline">
          ${[
            ["01", "Sayari", "Corporate registries, ownership and shipment records across 250+ jurisdictions. Answers: who owns whom, who shipped what."],
            ["02", "Tradeverifyd", "Trade relationships, risk annotations, scores and addresses. Answers: who trades with whom, and what is flagged."],
            ["03", "Tavily", "Search over government notices, research and journalism. Answers: what is already on the public record."],
            ["04", "Classify", "Every entity and link gets one evidence label: verified, suspected or missing."],
            ["05", "Publish", "Globe, network, company files and findings are all generated from the same dataset."]
          ].map(([n, h, p]) => `<div class="pipe card rv"><span class="n">${n}</span><h3>${h}</h3><p>${p}</p></div>`).join("")}
        </div>
      </section>

      <section class="section" style="padding-top:60px">
        <header class="section-head"><span class="kicker">Evidence rules</span><h2>Three labels, applied the same way everywhere</h2></header>
        <div class="rules">
          ${["verified", "suspected", "missing"].map((k) => `<div class="rule card rv"><div>${ST.badge(k)}</div><div><p>${ST.STATUS[k].explain}</p><p class="muted small" style="margin-top:8px">${{
            verified: "Examples: shipment-level trade records, registry ownership filings, a company's name on the UFLPA Entity List or under a CBP Withhold Release Order.",
            suspected: "Examples: an aggregated or inferred trade relationship without shipment-level records, a risk annotation, a shared address or officer, a reported procurement agreement.",
            missing: "Examples: an undisclosed beneficial owner, a supplier we could not identify, volume that known shipments don't explain."
          }[k]}</p></div></div>`).join("")}
        </div>
      </section>

      <section class="section" style="padding-top:60px">
        <div class="prose">
          <span class="kicker">What this is, and isn't</span>
          <h2>Limits we want you to know about</h2>
          <ul style="margin-top:18px">
            <li><b>Exposure is not guilt.</b> A trade link to a listed company shows a route by which forced-labour inputs <em>could</em> enter a product. It does not show that a specific panel contains them.</li>
            <li><b>Trade data is partial.</b> Customs records differ by country, and many flows (domestic Chinese trade especially) are not visible. Absence of a record is reported as missing, never as clean.</li>
            <li><b>Names are matched, not certain.</b> Entity resolution across datasets can merge or split companies. IDs are shown so every claim can be checked.</li>
            <li><b>Locations are approximate</b> where only a city or province was available.</li>
            <li><b>Snapshot in time.</b> Data was retrieved ${esc(ST.fmtDate(m.retrieved))}. Lists and ownership change.</li>
          </ul>
          ${(D.notes || "") ? `<p style="margin-top:18px" class="muted">${esc(D.notes)}</p>` : ""}
          ${(D.gaps || []).length ? `<h3 style="margin-top:28px">What we looked for and could not find</h3><ul style="margin-top:12px">${D.gaps.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>` : ""}
        </div>
      </section>
      <div style="height:80px"></div>
    </div>`;
  }
  ST.pages.method = { title: () => "Method", render };
})();
