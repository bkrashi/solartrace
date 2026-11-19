/* 3D force network */
(function () {
  const { D, esc, $, $$ } = ST;
  const COLORS = { verified: "#2e6447", suspected: "#d4901a", missing: "#a9a89e" };
  let g = null, ro = null, raf = 0;
  const state = { dims: 3, tier: false, flow: true, filters: { verified: true, suspected: true, missing: true, trade: true, ownership: true }, hl: null, path: false };

  const stageIdx = (e) => {
    const order = ["silicon", "polysilicon", "wafer", "cell", "module", "importer"];
    const i = order.indexOf(e.stage);
    return i >= 0 ? i : (e.stage === "owner" ? 2.5 : 3.5);
  };

  function data() {
    const f = state.filters;
    const nodes = D.entities.filter((e) => f[e.status]).map((e) => ({ id: e.id, e }));
    const ids = new Set(nodes.map((n) => n.id));
    const links = D.relationships
      .filter((r) => f[r.status] && f[r.type === "trade" ? "trade" : "ownership"] && ids.has(r.from) && ids.has(r.to))
      .map((r) => ({ source: r.from, target: r.to, r }));
    return { nodes, links };
  }

  function applyTier() {
    const spread = 70;
    g.graphData().nodes.forEach((n) => {
      if (state.tier) { n.fx = (stageIdx(n.e) - 2.5) * spread; n.fz = state.dims === 3 ? undefined : undefined; }
      else { n.fx = undefined; }
    });
    g.d3ReheatSimulation();
  }

  function refreshStyles() { g.nodeColor(g.nodeColor()).linkColor(g.linkColor()).linkWidth(g.linkWidth()).linkDirectionalParticles(g.linkDirectionalParticles()); }

  function focusNode(id) {
    const n = g.graphData().nodes.find((x) => x.id === id); if (!n) return;
    const dist = 110, len = Math.hypot(n.x || 1, n.y || 1, n.z || 1);
    const ratio = 1 + dist / len;
    g.cameraPosition(state.dims === 3 ? { x: (n.x || 1) * ratio, y: (n.y || 1) * ratio, z: (n.z || 1) * ratio } : { x: n.x, y: n.y, z: 220 }, n, 1300);
    const neigh = new Set([id]);
    ST.relsOf(id).forEach((r) => { neigh.add(r.from); neigh.add(r.to); });
    state.hl = neigh; state.path = false; refreshStyles();
    showCard(id);
  }

  function showCard(id) {
    let c = $("#netCard");
    if (!id) { if (c) c.remove(); return; }
    const e = ST.entity[id];
    if (!c) { c = document.createElement("div"); c.id = "netCard"; c.className = "net-card card"; $(".page-network").appendChild(c); }
    const rels = ST.relsOf(id);
    c.innerHTML = `<button class="x" aria-label="Close">✕</button>
      <span class="kicker" style="margin:0">${esc(ST.stageById[e.stage]?.label || e.stage)}</span>
      <h2>${esc(ST.name(e))}</h2>
      <p class="muted small">${esc(e.name)} · ${esc([e.city, e.country].filter(Boolean).join(", "))}</p>
      ${ST.plain(esc(e.plainRole || e.role || ""))}
      <div class="chips" style="margin-top:12px">${ST.badge(e.status)} ${ST.flagChips(e)}</div>
      <div class="panel-h">Links (${rels.length})</div>
      <ul class="rel-list">${rels.map((r) => {
        const o = ST.entity[r.from === id ? r.to : r.from];
        const dir = r.type === "trade" ? (r.from === id ? "supplies" : "buys from") : (r.from === id ? "owns" : "owned by");
        return `<li><span class="dot ${r.status}"></span><span>${dir} <a href="#" class="ent-link" data-jump="${o.id}">${esc(ST.name(o))}</a><br><small>${esc(r.label || "")} · ${ST.STATUS[r.status].short}</small></span></li>`;
      }).join("")}</ul>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><a class="btn btn-primary btn-sm" href="#/company/${e.id}">Company file →</a>${e.lat != null ? `<a class="btn btn-ghost btn-sm" href="#/globe?focus=${e.id}">On globe</a>` : ""}</div>`;
    $(".x", c).addEventListener("click", () => { showCard(null); state.hl = null; refreshStyles(); });
    $$("[data-jump]", c).forEach((a) => a.addEventListener("click", (ev) => { ev.preventDefault(); focusNode(a.dataset.jump); }));
  }

  let buildTimer = null;
  function buildUp() {
    if (!g) return;
    clearInterval(buildTimer);
    state.hl = null; state.path = false; showCard(null);
    $("#pathBtn").setAttribute("aria-pressed", "false");
    const full = data();
    const byId = Object.fromEntries(full.nodes.map((n) => [n.id, n]));
    // breadth-first from the US importer: the chain grows the way an investigator works
    const start = (D.meta.path || [])[0];
    const order = [], seen = new Set([start]), queue = [start];
    while (queue.length) {
      const id = queue.shift(); if (byId[id]) order.push(id);
      D.relationships.filter((r) => r.from === id || r.to === id).map((r) => (r.from === id ? r.to : r.from))
        .sort((a, b) => (D.meta.path.includes(b) ? 1 : 0) - (D.meta.path.includes(a) ? 1 : 0))
        .forEach((x) => { if (!seen.has(x)) { seen.add(x); queue.push(x); } });
    }
    full.nodes.forEach((n) => { if (!order.includes(n.id)) order.push(n.id); });
    const shown = new Set();
    const cap = $("#netCaption"); cap.hidden = false;
    g.graphData({ nodes: [], links: [] });
    let i = 0;
    const step = () => {
      if (i >= order.length) {
        clearInterval(buildTimer);
        cap.innerHTML = `<b>Done.</b> ${order.length} companies and ${full.links.length} links. Green is proven, orange suspected, grey unknown.`;
        setTimeout(() => g && g.zoomToFit(1000, 50), 300);
        return;
      }
      const id = order[i++]; shown.add(id);
      const n = byId[id], e = n.e;
      // place the new node next to something it is linked to, so it "grows" out of the web
      const anchor = full.links.find((l) => (l.r.from === id && shown.has(l.r.to)) || (l.r.to === id && shown.has(l.r.from)));
      if (anchor) { const o = byId[anchor.r.from === id ? anchor.r.to : anchor.r.from]; if (o.x != null) { n.x = o.x + (Math.random() - .5) * 20; n.y = o.y + (Math.random() - .5) * 20; n.z = (o.z || 0) + (Math.random() - .5) * 20; } }
      g.graphData({ nodes: full.nodes.filter((x) => shown.has(x.id)), links: full.links.filter((l) => shown.has(l.r.from) && shown.has(l.r.to)) });
      const link = anchor ? anchor.r : null;
      cap.innerHTML = `<span class="step-n">${i} / ${order.length}</span><b>${esc(ST.name(e))}</b> ${ST.badge(e.status)}<br><span>${esc(e.plainRole || "")}</span>${link ? `<br><small>${link.type === "trade" ? "Linked by trade" : "Linked by ownership"} · ${ST.STATUS[link.status].plain}</small>` : ""}`;
      if (i % 3 === 0 || i < 3) setTimeout(() => g && g.zoomToFit(700, 70), 250);
    };
    step();
    buildTimer = setInterval(step, ST.prefersReducedMotion() ? 400 : 1700);
  }

  function tracePath() {
    state.path = !state.path;
    const btn = $("#pathBtn"); btn.setAttribute("aria-pressed", String(state.path));
    if (state.path) {
      state.hl = new Set(D.meta.path || []);
      showCard(null);
      g.zoomToFit(1200, 60, (n) => state.hl.has(n.id));
    } else { state.hl = null; g.zoomToFit(1200, 40); }
    refreshStyles();
  }

  function render(app, r) {
    app.innerHTML = `
      <div class="graph-host" id="graphHost"><div class="loading" style="position:absolute;inset:0"><div class="spinner"></div><span>Building the network…</span></div></div>
      <div class="net-panel card">
        <span class="kicker" style="margin-bottom:8px">Ownership &amp; trade network</span>
        <h1>The web behind a panel</h1>
        <p class="sub">Each ball is a company. Lines show who sells to whom; moving dots are goods flowing toward the US buyer. Purple lines mean "owns". Drag to spin, click a ball for details.</p>
        <div class="ctrls">
          <div class="row" style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" id="buildBtn" type="button">▶ Build it step by step</button>
            <button class="btn btn-amber btn-sm" id="pathBtn" type="button" aria-pressed="false">Trace the main path</button>
            <button class="btn btn-ghost btn-sm" id="fitBtn" type="button">Fit view</button>
          </div>
          <div class="row" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <div class="seg" role="group" aria-label="Dimensions"><button type="button" data-dim="3" class="is-on">3D</button><button type="button" data-dim="2">2D</button></div>
            <div class="seg" role="group" aria-label="Layout"><button type="button" data-tier="0" class="is-on">Free</button><button type="button" data-tier="1">By tier</button></div>
            <div class="seg" role="group" aria-label="Goods flow"><button type="button" data-flow="1" class="is-on">Flow on</button><button type="button" data-flow="0">Off</button></div>
          </div>
          <div class="chips"><span class="lbl">Evidence</span>${["verified", "suspected", "missing"].map((s) => `<button class="chip is-on" type="button" data-f="${s}"><i class="sw" style="background:${COLORS[s]}"></i>${ST.STATUS[s].short}</button>`).join("")}</div>
          <div class="chips"><span class="lbl">Links</span><button class="chip is-on" type="button" data-f="trade">Trade</button><button class="chip is-on" type="button" data-f="ownership">Ownership</button></div>
        </div>
      </div>
      <div class="net-caption card" id="netCaption" hidden aria-live="polite"></div>
      <div class="net-legend card">
        <span><i style="background:${COLORS.verified}"></i>Proven</span><span><i style="background:${COLORS.suspected}"></i>Suspected</span><span><i style="background:${COLORS.missing}"></i>Unknown</span><span><i style="background:#b4482d"></i>On a US forced-labour blacklist</span><span><i style="background:#6a5fa8;border-radius:2px;height:3px;width:16px"></i>Ownership</span>
      </div>`;

    if (!ST.webglOK()) { $("#graphHost").innerHTML = '<div class="fallback" style="padding-top:30vh">This view needs WebGL. Try the <a href="#/companies">company files</a>.</div>'; return; }

    ST.loadScript(ST.LIB.graph).then(() => {
      const host = $("#graphHost");
      host.innerHTML = "";
      g = new window.ForceGraph3D(host, { controlType: "orbit" });
      g.width(host.clientWidth).height(host.clientHeight)
        .backgroundColor("rgba(0,0,0,0)")
        .showNavInfo(false)
        .graphData(data())
        .nodeId("id")
        .nodeVal((n) => 3 + ST.degree(n.id) * 2.2)
        .nodeRelSize(4.2)
        .nodeOpacity(0.95)
        .nodeResolution(20)
        .nodeColor((n) => {
          if (state.hl && !state.hl.has(n.id)) return "rgba(190,184,168,.35)";
          return ST.isFlagged(n.e) ? "#b4482d" : COLORS[n.e.status];
        })
        .nodeLabel((n) => `<div class="scene-tip"><b>${esc(ST.name(n.e))}</b><br>${esc(n.e.name)}<br>${esc(ST.stageById[n.e.stage]?.label || n.e.stage)} · ${esc(n.e.country || "")}<br>${esc(ST.STATUS[n.e.status].label)}</div>`)
        .linkColor((l) => {
          const on = !state.hl || (state.hl.has(l.r.from) && state.hl.has(l.r.to));
          if (!on) return "rgba(190,184,168,.25)";
          return l.r.type === "trade" ? COLORS[l.r.status] : "#6a5fa8";
        })
        .linkWidth((l) => (l.r.type === "trade" ? (l.r.status === "verified" ? 1.6 : 0.9) : 0.6) * (state.hl && state.hl.has(l.r.from) && state.hl.has(l.r.to) ? 1.8 : 1))
        .linkOpacity(0.75)
        .linkCurvature((l) => (l.r.type === "trade" ? 0.08 : 0.25))
        .linkDirectionalArrowLength((l) => (l.r.type === "trade" ? 3.5 : 0))
        .linkDirectionalArrowRelPos(0.92)
        .linkDirectionalArrowColor((l) => COLORS[l.r.status])
        .linkDirectionalParticles((l) => (!state.flow || l.r.type !== "trade" || (state.hl && !(state.hl.has(l.r.from) && state.hl.has(l.r.to)))) ? 0 : (l.r.status === "verified" ? 4 : l.r.status === "suspected" ? 2 : 0))
        .linkDirectionalParticleWidth(2.4)
        .linkDirectionalParticleSpeed((l) => (l.r.status === "verified" ? 0.008 : 0.004))
        .linkDirectionalParticleColor(() => "#d4901a")
        .linkLabel((l) => { const a = ST.entity[l.r.from], b = ST.entity[l.r.to]; return `<div class="scene-tip"><b>${esc(a.short || a.name)} → ${esc(b.short || b.name)}</b><br>${esc(l.r.label || l.r.type)} · ${ST.STATUS[l.r.status].short}</div>`; })
        .onNodeClick((n) => focusNode(n.id))
        .onBackgroundClick(() => { if (!state.path) { state.hl = null; refreshStyles(); showCard(null); } })
        .cooldownTicks(160);
      g.d3Force("charge").strength(-140);
      g.d3Force("link").distance((l) => (l.r.type === "trade" ? 46 : 32));
      ro = new ResizeObserver(() => g && g.width(host.clientWidth).height(host.clientHeight));
      ro.observe(host);
      // floating HTML labels that follow the nodes
      const layer = document.createElement("div");
      layer.className = "net-labels";
      host.appendChild(layer);
      const labels = {};
      // project a graph point to host pixels using the camera matrices (exact, no THREE needed)
      const project = (x, y, z) => {
        const cam = g.camera(); cam.updateMatrixWorld();
        const v = cam.matrixWorldInverse.elements, pm = cam.projectionMatrix.elements;
        const vx = v[0] * x + v[4] * y + v[8] * z + v[12], vy = v[1] * x + v[5] * y + v[9] * z + v[13], vz = v[2] * x + v[6] * y + v[10] * z + v[14];
        const cx = pm[0] * vx + pm[4] * vy + pm[8] * vz + pm[12], cy = pm[1] * vx + pm[5] * vy + pm[9] * vz + pm[13], cw = pm[3] * vx + pm[7] * vy + pm[11] * vz + pm[15];
        if (cw <= 0) return null;
        const W = host.clientWidth, H = host.clientHeight;
        return { x: (cx / cw + 1) / 2 * W, y: (1 - cy / cw) / 2 * H, s: (pm[5] * H / 2) / cw };
      };
      const loop = () => {
        if (!g) return;
        const nodes = g.graphData().nodes;
        nodes.forEach((n) => {
          let el = labels[n.id];
          if (!el) { el = labels[n.id] = document.createElement("span"); el.className = "net-label"; el.textContent = ST.name(n.e); layer.appendChild(el); }
          if (n.x == null) return;
          const p = project(n.x, n.y, n.z || 0);
          const dim = state.hl && !state.hl.has(n.id);
          el.style.display = p ? "" : "none";
          if (!p) return;
          const r = Math.cbrt(3 + ST.degree(n.id) * 2.2) * 4.2 * p.s; // node radius on screen
          el.style.transform = `translate(${p.x}px, ${p.y + r + 4}px) translate(-50%, 0)`;
          el.classList.toggle("dim", !!dim);
        });
        Object.keys(labels).forEach((id) => { if (!nodes.some((n) => n.id === id)) { labels[id].remove(); delete labels[id]; } });
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      setTimeout(() => {
        if (!g) return;
        g.zoomToFit(1000, 40);
        if (r.params.focus && ST.entity[r.params.focus]) setTimeout(() => focusNode(r.params.focus), 600);
        if (r.params.path) setTimeout(() => !state.path && tracePath(), 600);
        if (r.params.build) setTimeout(buildUp, 300);
      }, 1600);
    }).catch(() => { $("#graphHost").innerHTML = '<div class="fallback" style="padding-top:30vh">Could not load the 3D library.</div>'; });

    $("#pathBtn").addEventListener("click", () => g && tracePath());
    $("#buildBtn").addEventListener("click", buildUp);
    $("#fitBtn").addEventListener("click", () => g && g.zoomToFit(1000, 40));
    $$("[data-dim]").forEach((b) => b.addEventListener("click", () => {
      $$("[data-dim]").forEach((x) => x.classList.toggle("is-on", x === b));
      state.dims = +b.dataset.dim; if (!g) return;
      g.numDimensions(state.dims);
      if (state.tier) applyTier();
      setTimeout(() => g.zoomToFit(900, 40), 900);
    }));
    $$("[data-tier]").forEach((b) => b.addEventListener("click", () => {
      $$("[data-tier]").forEach((x) => x.classList.toggle("is-on", x === b));
      state.tier = b.dataset.tier === "1"; if (!g) return;
      applyTier(); setTimeout(() => g.zoomToFit(900, 40), 900);
    }));
    $$("[data-flow]").forEach((b) => b.addEventListener("click", () => {
      $$("[data-flow]").forEach((x) => x.classList.toggle("is-on", x === b));
      state.flow = b.dataset.flow === "1"; if (g) refreshStyles();
    }));
    $$("[data-f]").forEach((b) => b.addEventListener("click", () => {
      b.classList.toggle("is-on"); state.filters[b.dataset.f] = b.classList.contains("is-on");
      if (g) { g.graphData(data()); if (state.tier) applyTier(); }
    }));
  }

  ST.pages.network = {
    title: () => "3D network",
    render,
    tracePath: () => { if (g && !state.path) tracePath(); },
    focus: (id) => g && focusNode(id),
    destroy() {
      if (ro) ro.disconnect();
      cancelAnimationFrame(raf);
      clearInterval(buildTimer);
      if (g) { try { g.pauseAnimation(); g._destructor && g._destructor(); } catch (e) {} }
      g = null; state.hl = null; state.path = false; state.tier = false; state.dims = 3; state.flow = true;
      Object.keys(state.filters).forEach((k) => (state.filters[k] = true));
    }
  };
})();
