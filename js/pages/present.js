/* Present mode: a click-through story where the chain builds itself on the globe */
(function () {
  const { D, esc, $, $$ } = ST;
  const RAIL = ["USA", "Panel factories", "China HQ", "Wafers", "Xinjiang plant", "Raw silicon"];
  const RAIL_ICONS = [
    '<path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6"/>',
    '<path d="M3 20h18M4 20V10l5 3V10l5 3V10l5 3v7"/>',
    '<path d="M4 20V4h10v16M14 9h6v11M7 8h4M7 12h4M7 16h4"/>',
    '<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/>',
    '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
    '<path d="M5 18l4-9 3 5 2-3 5 7z"/>'
  ];
  let kit = null, idx = 0, t0 = 0, timer = null, auto = null, keyH = null;

  const scenes = () => D.present || [];
  function cumulative(i) {
    const ents = new Set(), rels = new Set();
    scenes().slice(0, i + 1).forEach((s) => { (s.add || []).forEach((x) => ents.add(x)); (s.rels || []).forEach((x) => rels.add(x)); });
    return { ents, rels };
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  function railHTML(i) {
    const reached = {};
    scenes().slice(0, i + 1).forEach((s) => { if (s.rail != null) reached[s.rail] = s.status; });
    const cur = scenes()[i].rail;
    return RAIL.map((label, k) => `
      <div class="rail-stop ${reached[k] ? "on " + reached[k] : ""} ${cur === k ? "now" : ""}">
        <span class="rail-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${RAIL_ICONS[k]}</svg></span>
        <span class="rail-lbl">${label}</span>
      </div>${k < RAIL.length - 1 ? `<i class="rail-link ${reached[k + 1] ? reached[k + 1] : ""}"></i>` : ""}`).join("");
  }

  function extraHTML(s) {
    if (s.stat) {
      const src = D.sources[s.stat.source];
      return `<div class="pr-stat"><b>${esc(s.stat.value)}</b><span>${esc(s.stat.label)}</span>${src ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">Source: ${esc(src.publisher || src.title)} ↗</a>` : ""}</div>`;
    }
    if (s.legend) {
      return `<div class="pr-legend">${["verified", "suspected", "missing"].map((k) => `
        <div class="pr-leg ${k}"><svg viewBox="0 0 80 12"><line x1="2" y1="6" x2="78" y2="6"/></svg><div><b>${ST.STATUS[k].label}</b><span>${ST.STATUS[k].plain}</span></div></div>`).join("")}
        <div class="pr-leg hot"><i></i><div><b>Red pulse</b><span>Company is on a US forced-labour blacklist.</span></div></div></div>`;
    }
    if (s.tally) {
      const c = { verified: 0, suspected: 0, missing: 0 };
      const { rels } = cumulative(scenes().length - 1);
      [...rels].map((id) => ST.rel[id]).filter((r) => r && r.type === "trade").forEach((r) => c[r.status]++);
      const tot = c.verified + c.suspected + c.missing;
      return `<div class="pr-tally">
        <div class="bar">${["verified", "suspected", "missing"].map((k) => `<i class="${k}" style="flex:${c[k]}"></i>`).join("")}</div>
        <div class="nums">${["verified", "suspected", "missing"].map((k) => `<span class="${k}"><b>${c[k]}</b> ${ST.STATUS[k].label.toLowerCase()}</span>`).join("")}</div>
        <p class="muted small">Out of ${tot} trade links we traced along this chain.</p></div>`;
    }
    if (s.cta) {
      return `<div class="pr-cta"><a class="btn btn-amber" href="#/globe">Explore the 3D globe</a><a class="btn btn-ghost" href="#/findings">See all the evidence</a><a class="btn btn-ghost" href="#/companies">Company files</a></div>`;
    }
    return "";
  }

  function show(i) {
    const list = scenes();
    idx = Math.max(0, Math.min(list.length - 1, i));
    const s = list[idx];
    const { ents, rels } = cumulative(idx);

    // globe
    if (kit) {
      kit.setVisible([...ents], [...rels]);
      const now = new Set(s.add || []);
      const seen = new Set();
      const place = (e) => [String(e.city || "").split(" (")[0].replace(/\s*\(.*$/, ""), String(e.country || "").replace(/ SAR, China$/, "")].filter(Boolean).join(", ");
      const labelIds = s.labels || [...ents];
      kit.setLabels(labelIds.map((id) => {
        const e = ST.entity[id], text = ST.name(e);
        if (!e || seen.has(text)) return null; seen.add(text);
        return { id, text, sub: now.has(id) ? place(e) : "", cls: `${e.status} ${ST.isFlagged(e) ? "hot" : ""} ${now.has(id) ? "" : "old"}` };
      }).filter(Boolean));
      const f = s.focus && ST.entity[s.focus];
      if (f && f.lat != null) kit.view(f.lat, f.lon, s.alt || 1.4, 2000);
      else if (s.camera) kit.view(s.camera.lat, s.camera.lng, s.camera.alt, 2000);
      kit.autoRotate(!!s.spin && !ST.prefersReducedMotion());
    }

    // card
    const card = $("#prCard");
    card.classList.remove("in"); void card.offsetWidth; card.classList.add("in");
    card.className = `pr-card card in ${s.status || ""}`;
    card.innerHTML = `
      <span class="pr-kicker">${esc(s.kicker || "")}</span>
      <h1>${esc(s.title)}</h1>
      <p class="pr-text">${ST.withTerms(s.text)}</p>
      ${s.status && s.evidence ? `<div class="pr-evidence ${s.status}"><span class="badge badge-${s.status}">${ST.STATUS[s.status].label}</span><span>${esc(s.evidence)}</span></div>` : ""}
      ${extraHTML(s)}`;
    $("#prRail").innerHTML = railHTML(idx);
    $("#prDots").innerHTML = list.map((_, k) => `<button type="button" class="${k === idx ? "on" : k < idx ? "done" : ""}" data-go="${k}" aria-label="Scene ${k + 1}"></button>`).join("");
    $$("#prDots [data-go]").forEach((b) => b.addEventListener("click", () => show(+b.dataset.go)));
    $("#prPrev").disabled = idx === 0;
    $("#prNext").innerHTML = idx === list.length - 1 ? "Explore →" : "Next <span aria-hidden='true'>→</span>";
    $("#prCount").textContent = `${idx + 1} / ${list.length}`;
    if (auto) { clearTimeout(auto); auto = setTimeout(() => (idx < list.length - 1 ? show(idx + 1) : toggleAuto(false)), 13000); }
  }

  function next() { if (idx === scenes().length - 1) ST.go("#/globe"); else show(idx + 1); }
  function toggleAuto(on) {
    if (on) { auto = setTimeout(() => show(idx + 1), 13000); } else { clearTimeout(auto); auto = null; }
    $("#prAuto").setAttribute("aria-pressed", String(!!on));
    $("#prAuto").textContent = on ? "❚❚ Auto" : "▶ Auto";
  }

  function render(app, r) {
    app.innerHTML = `
      <div class="pr-globe" id="prGlobe"><div class="loading" style="position:absolute;inset:0"><div class="spinner"></div><span>Loading the globe…</span></div></div>
      <div class="pr-top">
        <a class="pr-brand" href="#/" title="Exit presentation">Solar<em>Trace</em></a>
        <div class="pr-rail" id="prRail" aria-label="Progress along the supply chain"></div>
        <div class="pr-tools">
          <span class="pr-clock" id="prClock" title="Time since you started">0:00</span>
          <button type="button" id="prFull" title="Full screen (F)">⛶</button>
          <a href="#/" id="prExit" title="Exit (Esc)">✕</a>
        </div>
      </div>
      <div class="pr-card card" id="prCard"></div>
      <div class="pr-nav">
        <button type="button" class="btn btn-ghost btn-sm" id="prPrev">← Back</button>
        <div class="pr-dots" id="prDots"></div>
        <span class="pr-count" id="prCount"></span>
        <button type="button" class="btn btn-ghost btn-sm" id="prAuto" aria-pressed="false">▶ Auto</button>
        <button type="button" class="btn btn-primary" id="prNext">Next →</button>
      </div>`;

    $("#prPrev").addEventListener("click", () => show(idx - 1));
    $("#prNext").addEventListener("click", next);
    $("#prAuto").addEventListener("click", () => toggleAuto(!auto));
    $("#prFull").addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); });
    keyH = (e) => {
      if (e.target.closest("input, textarea")) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); next(); }
      else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); show(idx - 1); }
      else if (e.key === "Escape" && !document.fullscreenElement) ST.go("#/");
      else if (e.key === "f" || e.key === "F") $("#prFull").click();
    };
    document.addEventListener("keydown", keyH);
    t0 = Date.now();
    timer = setInterval(() => { const el = (Date.now() - t0) / 1000; const c = $("#prClock"); if (c) { c.textContent = fmt(el); c.classList.toggle("over", el > 180); } }, 500);

    idx = Math.max(0, +(r && r.params.s) || 0);
    show(idx);
    if (!ST.webglOK()) { $("#prGlobe").innerHTML = ""; return; }
    ST.globeKit.create($("#prGlobe"), { visible: true }).then((k) => {
      kit = k; const l = $("#prGlobe .loading"); if (l) l.remove();
      show(idx);
    }).catch(() => { $("#prGlobe").innerHTML = ""; });
  }

  ST.pages.present = {
    title: () => "Present",
    render,
    destroy() { clearInterval(timer); clearTimeout(auto); auto = null; document.removeEventListener("keydown", keyH); if (kit) kit.destroy(); kit = null; }
  };
})();
