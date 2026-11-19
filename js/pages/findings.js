/* Findings */
(function () {
  const { D, esc, $, $$ } = ST;

  function render(app, r) {
    let filter = "all";
    const t = { verified: 0, suspected: 0, missing: 0 };
    D.findings.forEach((f) => ["verified", "suspected", "missing"].forEach((k) => (t[k] += (f[k] || []).length)));
    const PL = { verified: ["Proven fact", "Proven facts"], suspected: ["Suspected link", "Suspected links"], missing: ["Unknown", "Unknowns"] };
    const SUB = { verified: "backed by paperwork", suspected: "clues, but no paperwork", missing: "we looked and found nothing" };

    app.innerHTML = `<div class="wrap">
      <header class="page-head">
        <span class="kicker">Findings · ${D.findings.length}</span>
        <h1>What we know, what we suspect, what's missing</h1>
        ${ST.plain("Six things we learned. For each one: what we can prove (green), what we suspect (orange), and what we couldn't find (grey).")}
      </header>
      <div class="tally">${["verified", "suspected", "missing"].map((k) => `<div class="tally-card ${k}"><span class="n" data-count="${t[k]}">0</span><div><div class="t">${PL[k][t[k] === 1 ? 0 : 1]}</div><div class="s">${SUB[k]}</div></div></div>`).join("")}</div>
      <div class="chips" id="ff" style="margin-bottom:22px"><span class="lbl">Headline</span><button class="chip is-on" data-ff="all" type="button">All</button>${["verified", "suspected", "missing"].map((k) => `<button class="chip" data-ff="${k}" type="button">${ST.STATUS[k].short}</button>`).join("")}</div>
      <div class="findings" id="fl"></div>
    </div>`;

    const col = (k, items) => `<div class="ev-col ${k}"><h4><span>${ST.STATUS[k].label}</span><span>${items.length}</span></h4>${items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : `<p class="none">${k === "missing" ? "No known gaps." : "None."}</p>`}</div>`;
    const draw = () => {
      $$("#ff [data-ff]").forEach((b) => b.classList.toggle("is-on", b.dataset.ff === filter));
      $("#fl").innerHTML = D.findings.filter((f) => filter === "all" || f.status === filter).map((f) => `
        <article class="finding card rv in" id="finding-${f.id}">
          <div class="finding-top"><span class="finding-id">${esc(f.id)}</span>${ST.badge(f.status, "Headline: " + ST.STATUS[f.status].short)}<span class="sev">Severity <b>${esc(f.severity)}</b></span></div>
          <h2>${esc(f.title)}</h2>
          ${ST.plain(esc(f.plain || ""))}
          <p class="summary">${esc(f.summary)}</p>
          <div class="ev-cols">${col("verified", f.verified || [])}${col("suspected", f.suspected || [])}${col("missing", f.missing || [])}</div>
          ${f.why ? `<p class="why">${esc(f.why)}</p>` : ""}
          <div class="finding-foot">
            ${ST.sourceList(f.source_ids)}
            <div class="acts">
              ${(f.focus?.entities || []).length ? `<a class="btn btn-ghost btn-sm" href="#/network?${f.focus.path ? "path=1" : "focus=" + f.focus.entities[0]}">In network</a>` : ""}
              ${(f.focus?.entities || []).some((id) => ST.entity[id]?.lat != null) ? `<a class="btn btn-primary btn-sm" href="#/globe?focus=${(f.focus.entities.find((id) => ST.entity[id]?.lat != null))}">On globe</a>` : ""}
            </div>
          </div>
          ${(f.focus?.entities || []).length ? `<p class="small muted">Companies: ${f.focus.entities.map(ST.entityLink).join(", ")}</p>` : ""}
        </article>`).join("") || `<p class="empty">No findings with this headline.</p>`;
    };
    $$("#ff [data-ff]").forEach((b) => b.addEventListener("click", () => { filter = b.dataset.ff; draw(); }));
    draw();
    if (r.params.f) setTimeout(() => $("#finding-" + r.params.f)?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
  }

  ST.pages.findings = { title: () => "Findings", render };
})();
