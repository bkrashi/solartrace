/* Sources & data provenance */
(function () {
  const { D, esc, $, $$ } = ST;
  function render(app) {
    const all = Object.entries(D.sources).map(([id, s]) => ({ id, ...s }));
    const by = (p) => all.filter((s) => s.provider === p).length;
    const P = D.meta.providers || {};
    app.innerHTML = `<div class="wrap">
      <header class="page-head">
        <span class="kicker">Sources &amp; live data</span>
        <h1>Every record, every link</h1>
        <p class="sub">SolarTrace's data was pulled from live connections to Sayari, Tradeverifyd and Tavily on ${esc(ST.fmtDate(D.meta.retrieved))}. Re-running the investigation regenerates this whole site.</p>
      </header>
      <div class="prov-stats">
        ${["sayari", "tradeverifyd", "tavily"].map((p) => `<div class="prov-stat card">${ST.prov(p)}<div class="n" data-count="${by(p)}">0</div><div class="muted small">${esc(P[p]?.label || "")}</div><div class="live" style="margin-top:8px"><i></i>${esc(P[p]?.status === "live" ? "Live pull · " + ST.fmtDate(P[p].retrieved || D.meta.retrieved) : (P[p]?.status || ""))}</div></div>`).join("")}
      </div>
      <div class="toolbar">
        <label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg><input id="sq" type="search" placeholder="Search sources…" aria-label="Search sources" /></label>
        <div class="chips" id="sp"><span class="lbl">Provider</span>${["all", "sayari", "tradeverifyd", "tavily"].map((p) => `<button type="button" class="chip ${p === "all" ? "is-on" : ""}" data-p="${p}">${p === "all" ? "All" : ST.PROVIDER[p]}</button>`).join("")}</div>
      </div>
      <div class="table-wrap"><table class="src-table"><thead><tr><th>Provider</th><th>Record / document</th><th>ID or publisher</th><th>Cited by</th></tr></thead><tbody id="sb"></tbody></table></div>
    </div>`;

    const citedBy = (id) => {
      const out = [];
      D.entities.forEach((e) => { if ((e.source_ids || []).includes(id) || (e.flags || []).some((f) => (f.source_ids || []).includes(id))) out.push(ST.entityLink(e.id)); });
      D.findings.forEach((f) => { if ((f.source_ids || []).includes(id)) out.push(`<a class="ent-link" href="#/findings?f=${f.id}">${f.id}</a>`); });
      return [...new Set(out)].slice(0, 6).join(", ");
    };
    let p = "all", q = "";
    const draw = () => {
      $$("#sp [data-p]").forEach((b) => b.classList.toggle("is-on", b.dataset.p === p));
      const t = q.toLowerCase();
      $("#sb").innerHTML = all.filter((s) => (p === "all" || s.provider === p) && (!t || JSON.stringify(s).toLowerCase().includes(t))).map((s) => `
        <tr><td>${ST.prov(s.provider)}</td>
        <td>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a>` : esc(s.title)}${s.note ? `<div class="muted small">${esc(s.note)}</div>` : ""}</td>
        <td>${s.record_id ? `<code>${esc(s.record_id)}</code>` : esc([s.publisher, s.date].filter(Boolean).join(", "))}</td>
        <td class="small">${citedBy(s.id)}</td></tr>`).join("");
    };
    $("#sq").addEventListener("input", (e) => { q = e.target.value; draw(); });
    $$("#sp [data-p]").forEach((b) => b.addEventListener("click", () => { p = b.dataset.p; draw(); }));
    draw();
  }
  ST.pages.sources = { title: () => "Sources", render };
})();
