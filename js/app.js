/* SolarTrace — app logic (vanilla JS, no build step) */
(function () {
  "use strict";

  const D = window.SOLARTRACE_DATA;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SVGNS = "http://www.w3.org/2000/svg";

  const STATUS = {
    verified: { label: "Verified record", short: "Verified", explain: "A retrievable record documents this, such as a registry filing, a bill of lading or a customs declaration." },
    suspected: { label: "Suspected exposure", short: "Suspected", explain: "Indicators point to this link, but no direct record confirms it yet. Treat it as a lead, not a fact." },
    missing: { label: "Missing information", short: "Missing", explain: "We looked and could not find the record needed. This is an open question, not an accusation." }
  };
  const PROVIDER = { sayari: "Sayari", tradeverifyd: "Tradeverifyd", tavily: "Tavily", derived: "Derived" };

  const entityById = Object.fromEntries(D.entities.map((e) => [e.id, e]));
  const relById = Object.fromEntries(D.relationships.map((r) => [r.id, r]));
  const stageById = Object.fromEntries(D.stages.map((s) => [s.id, s]));

  const state = {
    view: "overview",
    selected: null, // { kind: 'node'|'edge', id }
    tracing: false,
    filters: { trade: true, ownership: true, verified: true, suspected: true, missing: true },
    findingFilter: "all"
  };

  const badge = (status, text) => `<span class="badge badge-${status}">${esc(text || STATUS[status].label)}</span>`;
  const prov = (p) => `<span class="prov prov-${p}">${esc(PROVIDER[p] || p)}</span>`;

  /* =========================================================
   * Ribbon + landing
   * ========================================================= */
  function renderRibbon() {
    const p = D.meta.providers;
    $("#providerStatus").innerHTML = Object.keys(p)
      .map((k) => `<span class="ps ${p[k].status}" title="${esc(p[k].label)}">${esc(PROVIDER[k])}: ${p[k].status === "live" ? "live" : "sample"}</span>`)
      .join("");
    if (D.meta.mode === "live") $("#sampleRibbon").hidden = true;
  }

  function renderLanding() {
    $("#contextStats").innerHTML = D.context
      .map((c) => {
        const s = D.sources[c.source];
        return `<div class="stat"><div class="v">${esc(c.value)}</div><p class="l">${esc(c.label)}</p>
          <a class="src" href="${esc(s.url)}" target="_blank" rel="noopener">Source: ${esc(s.publisher)} ↗</a></div>`;
      })
      .join("");

    const hot = { raw: "High-risk step", poly: "Highest-risk step" };
    $("#chainSteps").innerHTML = D.stages
      .map((s) => `<li class="${hot[s.id] ? "hot" : ""}"><h3>${esc(s.label)}</h3><p>${esc(s.hint)}</p>${hot[s.id] ? `<span class="risk">${hot[s.id]}</span>` : ""}</li>`)
      .join("");
  }

  /* =========================================================
   * Network
   * ========================================================= */
  const W = 1180, H = 672, R = 28;
  const STAGE_X = { raw: 90, poly: 290, wafer: 490, cell: 690, module: 890, buyer: 1090 };
  let svg;

  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function buildNetwork() {
    const host = $("#netCanvas");
    host.innerHTML = "";
    svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Ownership and trade network for the sample importer" }, host);

    // markers
    const defs = el("defs", {}, svg);
    const colors = { verified: "var(--forest-2)", suspected: "var(--amber)", missing: "var(--grey)" };
    for (const st in colors) {
      const a = el("marker", { id: `arrow-${st}`, viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, defs);
      el("path", { d: "M0 0L10 5L0 10z", fill: colors[st] }, a);
      const d = el("marker", { id: `diamond-${st}`, viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "8", markerHeight: "8", orient: "auto" }, defs);
      el("path", { d: "M5 0L10 5L5 10L0 5z", fill: colors[st] }, d);
    }

    // background: stage columns + band rules
    const bg = el("g", {}, svg);
    D.stages.forEach((s) => {
      const x = STAGE_X[s.id];
      el("line", { x1: x, y1: 255, x2: x, y2: 630, class: "stage-rule" }, bg);
      const t = el("text", { x, y: 656, "text-anchor": "middle", class: "stage-label" }, bg);
      t.textContent = s.label;
    });
    const t1 = el("text", { x: 24, y: 34, class: "stage-label" }, bg);
    t1.textContent = "Who owns whom";
    const t2 = el("text", { x: 24, y: 268, class: "stage-label" }, bg);
    t2.textContent = "Who ships to whom";
    el("line", { x1: 24, y1: 245, x2: W - 24, y2: 245, stroke: "var(--line)" }, bg);

    // XUAR zone
    const xs = D.entities.filter((e) => e.xuar);
    if (xs.length) {
      const minX = Math.min(...xs.map((e) => e.x)) - 70, maxX = Math.max(...xs.map((e) => e.x)) + 74;
      const y = xs[0].y;
      el("rect", { x: minX, y: y - 78, width: maxX - minX, height: 168, rx: 16, class: "xuar-zone" }, bg);
      const lt = el("text", { x: minX + 14, y: y - 58, class: "xuar-label" }, bg);
      lt.textContent = "XINJIANG (XUAR) · UFLPA PRESUMPTION";
    }

    // edges
    const gEdges = el("g", { class: "edges" }, svg);
    D.relationships.forEach((r) => {
      const a = entityById[r.from], b = entityById[r.to];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const x1 = a.x + ux * (R + 4), y1 = a.y + uy * (R + 4);
      const x2 = b.x - ux * (R + 8), y2 = b.y - uy * (R + 8);
      const g = el("g", { class: `edge-group ${r.type}`, "data-edge": r.id, tabindex: "0", role: "button", "aria-label": `${r.type} link ${a.short} to ${b.short}: ${STATUS[r.status].label}` }, gEdges);
      const d = `M${x1} ${y1}L${x2} ${y2}`;
      el("path", { d, class: "edge-hit" }, g);
      el("path", {
        d, class: `edge ${r.status} ${r.type}`,
        "marker-end": `url(#${r.type === "trade" ? "arrow" : "diamond"}-${r.status})`
      }, g);
      // label
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const w = r.label.length * 6.1 + 14;
      el("rect", { x: mx - w / 2, y: my - 10, width: w, height: 20, rx: 10, class: "edge-label-bg" }, g);
      const tx = el("text", { x: mx, y: my + 4, "text-anchor": "middle", class: "edge-label" }, g);
      tx.textContent = r.label;

      g.addEventListener("click", (e) => { e.stopPropagation(); select({ kind: "edge", id: r.id }); });
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select({ kind: "edge", id: r.id }); } });
      g.addEventListener("mousemove", (e) => showTip(e, `<b>${esc(STATUS[r.status].short)}</b> · ${esc(r.type === "trade" ? r.product : "Ownership")}<br>${esc(r.detail)}`));
      g.addEventListener("mouseleave", hideTip);
    });

    // nodes
    const gNodes = el("g", { class: "nodes" }, svg);
    D.entities.forEach((n) => {
      const g = el("g", { class: `node ${n.status}`, "data-node": n.id, transform: `translate(${n.x} ${n.y})`, tabindex: "0", role: "button", "aria-label": `${n.name}, ${n.country}: ${STATUS[n.status].label}` }, gNodes);
      el("circle", { r: 0, class: "pulse" }, g);
      el("circle", { r: R + 12, class: "halo" }, g);
      if (n.kind === "holding") el("rect", { x: -R, y: -R, width: R * 2, height: R * 2, rx: 10, class: "disc" }, g);
      else el("circle", { r: R, class: "disc" }, g);
      const gl = el("text", { y: n.status === "missing" ? 6 : 5, class: "glyph" }, g);
      gl.textContent = n.status === "missing" ? "?" : n.flag;
      const nameW = n.short.length * 7.4 + 12;
      el("rect", { x: -nameW / 2, y: R + 8, width: nameW, height: 34, rx: 6, class: "name-bg" }, g);
      const nm = el("text", { y: R + 22, class: "name" }, g);
      nm.textContent = n.short;
      const ct = el("text", { y: R + 37, class: "country" }, g);
      ct.textContent = n.country;

      g.addEventListener("click", (e) => { e.stopPropagation(); select({ kind: "node", id: n.id }); });
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select({ kind: "node", id: n.id }); } });
      g.addEventListener("mousemove", (e) => showTip(e, `<b>${esc(n.name)}</b><br>${esc(STATUS[n.status].label)} · ${esc(n.country)}`));
      g.addEventListener("mouseleave", hideTip);
    });

    svg.addEventListener("click", () => select(null));
    applyNetworkState();
  }

  function edgeVisible(r) {
    const f = state.filters;
    return f[r.type] && f[r.status] && nodeVisible(entityById[r.from]) && nodeVisible(entityById[r.to]);
  }
  function nodeVisible(n) { return state.filters[n.status]; }

  function pathEdgeIds() {
    const p = D.exposurePath, ids = new Set();
    for (let i = 0; i < p.length - 1; i++) {
      const r = D.relationships.find((x) => (x.from === p[i + 1] && x.to === p[i]) || (x.from === p[i] && x.to === p[i + 1]));
      if (r) ids.add(r.id);
    }
    return ids;
  }

  function applyNetworkState() {
    if (!svg) return;
    const sel = state.selected;
    const onPathNodes = new Set(state.tracing ? D.exposurePath : []);
    const onPathEdges = state.tracing ? pathEdgeIds() : new Set();
    svg.classList.toggle("tracing", state.tracing);

    let focusNodes = null, focusEdges = null;
    if (sel && sel.kind === "node") {
      focusNodes = new Set([sel.id]); focusEdges = new Set();
      D.relationships.forEach((r) => { if (r.from === sel.id || r.to === sel.id) { focusEdges.add(r.id); focusNodes.add(r.from); focusNodes.add(r.to); } });
    } else if (sel && sel.kind === "edge") {
      const r = relById[sel.id];
      focusEdges = new Set([r.id]); focusNodes = new Set([r.from, r.to]);
    } else if (state.tracing) {
      focusNodes = onPathNodes; focusEdges = onPathEdges;
    }

    $$("[data-edge]", svg).forEach((g) => {
      const r = relById[g.dataset.edge];
      g.classList.toggle("is-hidden", !edgeVisible(r));
      g.classList.toggle("is-dim", !!focusEdges && !focusEdges.has(r.id));
      g.classList.toggle("is-selected", !!sel && sel.kind === "edge" && sel.id === r.id);
      $(".edge", g).classList.toggle("on-path", onPathEdges.has(r.id));
    });
    $$("[data-node]", svg).forEach((g) => {
      const n = entityById[g.dataset.node];
      g.classList.toggle("is-hidden", !nodeVisible(n));
      g.classList.toggle("is-dim", !!focusNodes && !focusNodes.has(n.id));
      g.classList.toggle("is-selected", !!sel && sel.kind === "node" && sel.id === n.id);
      g.classList.toggle("on-path", onPathNodes.has(n.id));
    });
    $("#traceBtn").setAttribute("aria-pressed", String(state.tracing));
    $("#traceBtn").textContent = state.tracing ? "Hide exposure path" : "Trace exposure path";
    renderDetail();
  }

  function select(sel) { state.selected = sel; applyNetworkState(); }

  function recordList(ids) {
    if (!ids || !ids.length) return `<p class="rec">No record found. That absence is the finding.</p>`;
    return `<ul>${ids.map((id) => {
      const s = D.sources[id]; if (!s) return "";
      const body = s.url
        ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a>`
        : `${esc(s.title)}`;
      return `<li class="rec">${prov(s.provider)} <span class="id">${esc(id)}</span>${s.sample ? ' <span class="sample-tag">Sample</span>' : ""}<div>${body}</div></li>`;
    }).join("")}</ul>`;
  }

  function renderDetail() {
    const panel = $("#detailPanel");
    const sel = state.selected;

    if (!sel && state.tracing) {
      const ids = [...pathEdgeIds()].map((id) => relById[id]);
      const c = { verified: 0, suspected: 0, missing: 0 };
      ids.forEach((r) => c[r.status]++);
      const steps = D.exposurePath.map((id) => entityById[id]);
      panel.innerHTML = `
        <p class="eyebrow">Exposure path · importer → origin</p>
        <h2>${c.verified} documented links, then the trail turns amber</h2>
        <div class="meta">${badge("verified", `${c.verified} verified`)} ${badge("suspected", `${c.suspected} suspected`)} ${c.missing ? badge("missing", `${c.missing} missing`) : ""}</div>
        <ul>${ids.map((r, i) => `<li class="link-row" data-pick-edge="${r.id}"><span class="dot ${r.status}"></span><span><b>${esc(steps[i + 1].short)}</b> → ${esc(steps[i].short)}<br><small>${esc(r.label)} · ${esc(STATUS[r.status].short)}</small></span></li>`).join("")}</ul>
        <div class="callout suspected">Every link from the importer back to the wafer maker has a record. The links to XUAR polysilicon and silicon rest on reported agreements and co-location. That is enough to raise UFLPA risk, but not enough to prove the panels' origin either way.</div>`;
      bindPicks(panel);
      return;
    }

    if (!sel) {
      panel.innerHTML = `
        <div class="empty-state"><div>
          <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="var(--amber-tint)"/><circle cx="32" cy="32" r="10" fill="var(--amber)"/><path d="M50 50l10 10" stroke="var(--forest)" stroke-width="4" stroke-linecap="round"/></svg>
          <h2>Select a company or a link</h2>
          <p>Or press <b>Trace exposure path</b> to follow Lumen Ridge's panels back to their origin.</p>
        </div></div>`;
      return;
    }

    if (sel.kind === "node") {
      const n = entityById[sel.id];
      const links = D.relationships.filter((r) => r.from === n.id || r.to === n.id);
      const stage = n.stage ? stageById[n.stage].label : (n.kind === "holding" ? "Holding company" : "Beneficial owner");
      panel.innerHTML = `
        <p class="eyebrow">${esc(stage)}</p>
        <h2>${esc(n.name)}</h2>
        <div class="meta">${badge(n.status)} <span>${esc(n.country)}</span> ${n.xuar ? '<span class="badge badge-suspected">XUAR location</span>' : ""}</div>
        <p class="desc">${esc(n.role)}</p>
        <h3>Connections (${links.length})</h3>
        <ul>${links.map((r) => {
          const other = entityById[r.from === n.id ? r.to : r.from];
          const dir = r.type === "ownership" ? (r.from === n.id ? "owns →" : "owned by ←") : (r.from === n.id ? "ships to →" : "buys from ←");
          return `<li class="link-row" data-pick-edge="${r.id}"><span class="dot ${r.status}"></span><span>${esc(dir)} <b>${esc(other.short)}</b><br><small>${esc(r.label)} · ${esc(STATUS[r.status].short)}</small></span></li>`;
        }).join("")}</ul>
        <h3>Records</h3>
        ${recordList(n.sources)}
        <div class="callout ${n.status}"><b>${esc(STATUS[n.status].label)}.</b> ${esc(STATUS[n.status].explain)}</div>`;
    } else {
      const r = relById[sel.id];
      const a = entityById[r.from], b = entityById[r.to];
      panel.innerHTML = `
        <p class="eyebrow">${r.type === "trade" ? "Trade link · goods flow" : "Ownership link"}</p>
        <h2>${esc(a.short)} → ${esc(b.short)}</h2>
        <div class="meta">${badge(r.status)} ${prov(r.provider)}</div>
        ${r.product ? `<p class="desc"><b>${esc(r.product)}</b></p>` : ""}
        <p class="desc">${esc(r.detail)}</p>
        <h3>Records</h3>
        ${recordList(r.records)}
        <h3>Endpoints</h3>
        <ul>
          <li class="link-row" data-pick-node="${a.id}"><span class="dot ${a.status}"></span><span><b>${esc(a.name)}</b><br><small>${esc(a.country)}</small></span></li>
          <li class="link-row" data-pick-node="${b.id}"><span class="dot ${b.status}"></span><span><b>${esc(b.name)}</b><br><small>${esc(b.country)}</small></span></li>
        </ul>
        <div class="callout ${r.status}"><b>${esc(STATUS[r.status].label)}.</b> ${esc(STATUS[r.status].explain)}</div>`;
    }
    bindPicks(panel);
  }

  function bindPicks(panel) {
    $$("[data-pick-edge]", panel).forEach((li) => li.addEventListener("click", () => select({ kind: "edge", id: li.dataset.pickEdge })));
    $$("[data-pick-node]", panel).forEach((li) => li.addEventListener("click", () => select({ kind: "node", id: li.dataset.pickNode })));
  }

  const tip = () => $("#tooltip");
  function showTip(e, html) {
    const t = tip();
    t.innerHTML = html; t.hidden = false;
    const pad = 14, w = t.offsetWidth, h = t.offsetHeight;
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + w > innerWidth - 8) x = e.clientX - w - pad;
    if (y + h > innerHeight - 8) y = e.clientY - h - pad;
    t.style.left = x + "px"; t.style.top = y + "px";
  }
  function hideTip() { tip().hidden = true; }

  function bindNetworkControls() {
    $$("[data-filter]").forEach((cb) => cb.addEventListener("change", () => {
      state.filters[cb.dataset.filter] = cb.checked;
      applyNetworkState();
    }));
    $("#traceBtn").addEventListener("click", () => { state.tracing = !state.tracing; state.selected = null; applyNetworkState(); });
    $("#resetBtn").addEventListener("click", resetNetwork);
  }
  function resetNetwork() {
    state.tracing = false; state.selected = null;
    Object.keys(state.filters).forEach((k) => (state.filters[k] = true));
    $$("[data-filter]").forEach((cb) => (cb.checked = true));
    applyNetworkState();
  }

  /* =========================================================
   * Findings
   * ========================================================= */
  function renderFindings() {
    const t = { verified: 0, suspected: 0, missing: 0 };
    D.findings.forEach((f) => { t.verified += f.verified.length; t.suspected += f.suspected.length; t.missing += f.missing.length; });
    const PLURAL = { verified: ["Verified record", "Verified records"], suspected: ["Suspected exposure", "Suspected exposures"], missing: ["Missing item", "Missing items"] };
    const sub = { verified: "facts backed by records", suspected: "leads that need confirmation", missing: "open questions to close" };
    $("#tally").innerHTML = ["verified", "suspected", "missing"].map((k) =>
      `<div class="tally-card ${k}"><span class="n">${t[k]}</span><div><div class="t">${PLURAL[k][t[k] === 1 ? 0 : 1]}</div><div class="s">${sub[k]}</div></div></div>`).join("");

    const list = D.findings.filter((f) => state.findingFilter === "all" || f.status === state.findingFilter);
    $("#findingsList").innerHTML = list.map((f) => {
      const col = (k, items) => `<div class="ev-col ${k}"><h4><span>${STATUS[k].label}</span><span>${items.length}</span></h4>${items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : `<p class="none">${k === "missing" ? "No known gaps." : "None."}</p>`}</div>`;
      const srcs = f.sources.map((id) => {
        const s = D.sources[id]; if (!s) return "";
        return s.url
          ? `<li>${prov(s.provider)} <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> <span class="sample-ref">${esc(s.publisher)}</span></li>`
          : `<li>${prov(s.provider)} <span class="sample-ref">${esc(s.title)} <code>${esc(id)}</code> · sample record</span></li>`;
      }).join("");
      return `<article class="finding" id="finding-${f.id}">
        <div class="finding-top"><span class="finding-id">${f.id}</span>${badge(f.status, "Headline: " + STATUS[f.status].short)}<span class="sev">Severity <b>${esc(f.severity)}</b></span>${f.context ? '<span class="context-flag">Real public context</span>' : '<span class="sample-tag">Sample</span>'}</div>
        <h2>${esc(f.title)}</h2>
        <p class="summary">${esc(f.summary)}</p>
        <div class="ev-cols">${col("verified", f.verified)}${col("suspected", f.suspected)}${col("missing", f.missing)}</div>
        <p class="why">${esc(f.whyItMatters)}</p>
        <div class="finding-foot"><ul class="src-list">${srcs}</ul>
          <button type="button" class="link-btn" data-show="${f.id}">View in network →</button></div>
      </article>`;
    }).join("") || `<p class="section-lede">No findings with this headline status.</p>`;

    $$("[data-show]").forEach((b) => b.addEventListener("click", () => showInNetwork(D.findings.find((f) => f.id === b.dataset.show))));
  }

  function showInNetwork(f) {
    resetNetwork();
    if (f.focus.path) state.tracing = true;
    if (f.focus.node && !f.focus.path) state.selected = { kind: "node", id: f.focus.node };
    location.hash = "#/network";
    applyNetworkState();
  }

  function bindFindingFilters() {
    $$("[data-ffilter]").forEach((b) => b.addEventListener("click", () => {
      state.findingFilter = b.dataset.ffilter;
      $$("[data-ffilter]").forEach((x) => x.classList.toggle("is-on", x === b));
      renderFindings();
    }));
  }

  /* =========================================================
   * Router
   * ========================================================= */
  const VIEWS = ["overview", "network", "findings"];
  function route() {
    const v = (location.hash.match(/#\/(\w+)/) || [])[1];
    const view = VIEWS.includes(v) ? v : "overview";
    const changed = view !== state.view;
    state.view = view;
    $$(".view").forEach((s) => (s.hidden = s.dataset.view !== view));
    $$(".tabs a").forEach((a) => {
      const on = a.dataset.view === view;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (changed && !demo.scrolling) window.scrollTo(0, 0);
    if (view === "network") requestAnimationFrame(() => { const c = $("#netCanvas"); c.scrollLeft = c.scrollWidth; });
    hideTip();
  }

  /* =========================================================
   * 3-minute demo presenter
   * ========================================================= */
  const DEMO_STEPS = [
    { at: 0, text: "<b>The problem.</b> A solar panel passes through about six factories. Roughly 45% of the world's polysilicon came from Xinjiang, where forced labour is documented.", run: () => go("overview", "#main") },
    { at: 30, text: "<b>Our rule.</b> Every claim carries one of three labels: verified record, suspected exposure or missing information. We never blur them together.", run: () => go("overview", ".evidence-explainer") },
    { at: 55, text: "<b>Start at the importer.</b> Lumen Ridge buys panels from Pacifica in Vietnam. That link has 412 verified shipments.", run: () => { go("network"); resetNetwork(); select({ kind: "node", id: "lumen" }); } },
    { at: 85, text: "<b>Trace exposure.</b> The links are green back to the wafer maker. At polysilicon, inside the XUAR, the trail turns amber: suspected, not proven.", run: () => { go("network"); resetNetwork(); state.tracing = true; applyNetworkState(); } },
    { at: 115, text: "<b>What's missing matters.</b> 40% of Sunvale's wafers can't be traced, and the owner behind Harbor Crest is hidden behind nominee companies.", run: () => { go("network"); resetNetwork(); select({ kind: "node", id: "unknownWafer" }); } },
    { at: 140, text: "<b>Findings.</b> Each finding splits its evidence into three columns and links its sources. Tavily links open real public reporting.", run: () => go("findings", "#main") },
    { at: 165, text: "<b>Next.</b> Connect the live Sayari and Tradeverifyd MCP servers and the sample records become real investigations, under the same evidence rules.", run: () => go("findings", ".next-steps") }
  ];
  const DEMO_TOTAL = 180;
  const demo = { on: false, i: 0, start: 0, timer: null, scrolling: false };

  function go(view, target) {
    demo.scrolling = true;
    location.hash = "#/" + view;
    route();
    requestAnimationFrame(() => {
      const t = target ? $(target) : null;
      if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      else if (view === "network") $("#view-network").scrollIntoView({ behavior: "smooth", block: "start" });
      demo.scrolling = false;
    });
  }

  function demoShow(i) {
    demo.i = Math.max(0, Math.min(DEMO_STEPS.length - 1, i));
    const s = DEMO_STEPS[demo.i];
    $("#demoText").innerHTML = s.text;
    $("#demoCount").textContent = `Step ${demo.i + 1} / ${DEMO_STEPS.length} · cue ${fmt(s.at)}`;
    $("#demoNext").textContent = demo.i === DEMO_STEPS.length - 1 ? "Finish" : "Next →";
    s.run();
  }
  function fmt(sec) { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
  function tick() {
    const el = (Date.now() - demo.start) / 1000;
    const left = DEMO_TOTAL - el;
    $("#demoTime").textContent = left >= 0 ? fmt(left) : "+" + fmt(-left);
    $(".demo-clock").classList.toggle("over", left < 0);
    $("#demoProgress").style.width = Math.min(100, (el / DEMO_TOTAL) * 100) + "%";
  }
  function demoStart() {
    demo.on = true; demo.start = Date.now();
    $("#demoBar").hidden = false;
    $("#demoToggle").setAttribute("aria-pressed", "true");
    demoShow(0); tick();
    demo.timer = setInterval(tick, 500);
  }
  function demoStop() {
    demo.on = false; clearInterval(demo.timer);
    $("#demoBar").hidden = true;
    $("#demoToggle").setAttribute("aria-pressed", "false");
  }
  function bindDemo() {
    $("#demoToggle").addEventListener("click", () => (demo.on ? demoStop() : demoStart()));
    $("#demoNext").addEventListener("click", () => (demo.i === DEMO_STEPS.length - 1 ? demoStop() : demoShow(demo.i + 1)));
    $("#demoPrev").addEventListener("click", () => demoShow(demo.i - 1));
    $("#demoClose").addEventListener("click", demoStop);
    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "d" || e.key === "D") { demo.on ? demoStop() : demoStart(); return; }
      if (demo.on) {
        if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); $("#demoNext").click(); }
        else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); demoShow(demo.i - 1); }
        else if (e.key === "Escape") demoStop();
      } else if (e.key === "Escape" && state.view === "network") select(null);
      if (["1", "2", "3"].includes(e.key) && !e.target.closest("[role=button], button")) location.hash = "#/" + VIEWS[+e.key - 1];
    });
  }

  /* ========================================================= */
  function init() {
    renderRibbon();
    renderLanding();
    buildNetwork();
    bindNetworkControls();
    renderFindings();
    bindFindingFilters();
    bindDemo();
    window.addEventListener("hashchange", route);
    state.view = null;
    route();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
