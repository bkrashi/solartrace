/* 3D globe: shared kit + full-screen globe page with guided tour */
(function () {
  const { D, esc, $, $$ } = ST;
  const COLORS = { verified: "#2e6447", suspected: "#d4901a", missing: "#8b8a80" };
  const STAGE_COLORS = { silicon: "#7a3b1d", polysilicon: "#b4482d", wafer: "#d4901a", cell: "#6f8f3a", module: "#2e6447", importer: "#1e4630", holding: "#5b5f8f", owner: "#5b5f8f" };

  const located = () => D.entities.filter((e) => e.lat != null && e.lon != null);
  const arcRels = () => D.relationships.filter((r) => {
    const a = ST.entity[r.from], b = ST.entity[r.to];
    return a && b && a.lat != null && b.lat != null && (Math.abs(a.lat - b.lat) + Math.abs(a.lon - b.lon) > 0.3);
  });

  function entTip(e) {
    return `<div class="scene-tip"><b>${esc(e.name)}</b><br>${esc(ST.stageById[e.stage]?.label || e.stage)} · ${esc([e.city, e.country].filter(Boolean).join(", "))}<br>${esc(ST.STATUS[e.status].label)}${ST.isFlagged(e) ? "<br>⚑ " + esc(e.flags.filter((f) => /uflpa|withhold|wro|entity list|sanction/i.test(f.label)).map((f) => f.label).join(", ")) : ""}</div>`;
  }
  function relTip(r) {
    const a = ST.entity[r.from], b = ST.entity[r.to];
    return `<div class="scene-tip"><b>${esc(a.short || a.name)} → ${esc(b.short || b.name)}</b><br>${esc(r.type === "trade" ? "Trade" : r.type)} · ${esc(r.label || "")}<br>${esc(ST.STATUS[r.status].label)}</div>`;
  }

  /* ---------------- kit ---------------- */
  ST.globeKit = {
    async create(host, opts = {}) {
      await ST.loadScript(ST.LIB.globe);
      const features = await ST.world().catch(() => []);
      const chainCountries = new Set(D.entities.map((e) => e.country_iso || "").filter(Boolean));
      const filters = { verified: true, suspected: true, missing: true, trade: true, ownership: true };
      let highlight = null; // Set of entity ids
      let visE = opts.visible ? new Set() : null, visR = opts.visible ? new Set() : null; // presentation reveal
      let selected = null;

      const g = new window.Globe(host, { animateIn: true, waitForGlobeReady: true });
      const size = () => { g.width(host.clientWidth).height(host.clientHeight); };
      size();
      g.backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true).atmosphereColor("#d4901a").atmosphereAltitude(opts.mini ? 0.16 : 0.2)
        .showGraticules(!opts.mini);
      const mat = g.globeMaterial();
      if (mat && mat.color) { mat.color.set("#f4ecda"); if (mat.emissive) mat.emissive.set("#2a2216"); if ("emissiveIntensity" in mat) mat.emissiveIntensity = 0.06; if ("shininess" in mat) mat.shininess = 6; }

      g.polygonsData(features.filter((f) => String(f.id) !== "010"))
        .polygonCapColor((f) => chainCountries.has(String(f.id)) ? "rgba(46,100,71,.62)" : "rgba(30,70,48,.13)")
        .polygonSideColor(() => "rgba(0,0,0,0)")
        .polygonStrokeColor((f) => chainCountries.has(String(f.id)) ? "rgba(18,41,28,.7)" : "rgba(30,70,48,.32)")
        .polygonAltitude((f) => (chainCountries.has(String(f.id)) ? 0.007 : 0.004))
        .polygonsTransitionDuration(0)
        .polygonLabel((f) => f.properties && f.properties.name ? `<div class="scene-tip">${esc(f.properties.name)}</div>` : "");

      const pts = () => located().filter((e) => filters[e.status] && (!visE || visE.has(e.id)));
      const visRel = (r) => (!visR || visR.has(r.id)) && filters[r.status] && filters[r.type === "trade" ? "trade" : "ownership"] && filters[ST.entity[r.from].status] && filters[ST.entity[r.to].status];
      const dim = (id) => highlight && !highlight.has(id);

      g.pointsData(pts())
        .pointLat("lat").pointLng("lon")
        .pointAltitude((e) => (selected === e.id ? 0.09 : 0.025 + Math.min(ST.degree(e.id), 6) * 0.006))
        .pointRadius((e) => (opts.mini ? 0.55 : 0.42) + Math.min(ST.degree(e.id), 6) * 0.06)
        .pointColor((e) => dim(e.id) ? "rgba(139,138,128,.35)" : (STAGE_COLORS[e.stage] || COLORS[e.status]))
        .pointResolution(16)
        .pointsMerge(false)
        .pointLabel(entTip);

      g.arcsData(arcRels().filter(visRel))
        .arcStartLat((r) => ST.entity[r.from].lat).arcStartLng((r) => ST.entity[r.from].lon)
        .arcEndLat((r) => ST.entity[r.to].lat).arcEndLng((r) => ST.entity[r.to].lon)
        .arcColor((r) => { const c = COLORS[r.status]; const dimmed = highlight && !(highlight.has(r.from) && highlight.has(r.to)); return dimmed ? ["rgba(139,138,128,.12)", "rgba(139,138,128,.12)"] : [c + "55", c]; })
        .arcStroke((r) => ((r.type === "trade" ? (opts.mini ? 0.7 : 0.55) : 0.3) + (r.status === "verified" ? 0.15 : 0)) * (opts.visible ? 1.9 : 1))
        .arcDashLength((r) => (r.status === "verified" ? 0.6 : r.status === "suspected" ? 0.25 : 0.05))
        .arcDashGap((r) => (r.status === "verified" ? 0.25 : r.status === "suspected" ? 0.18 : 0.12))
        .arcDashInitialGap(() => Math.random())
        .arcDashAnimateTime((r) => (r.type === "trade" ? 2600 : 0))
        .arcAltitudeAutoScale(0.42)
        .arcLabel(relTip);

      const rings = () => located().filter((e) => ST.isFlagged(e) && filters[e.status] && (!visE || visE.has(e.id)));
      g.ringsData(rings())
        .ringLat("lat").ringLng("lon")
        .ringColor(() => (t) => `rgba(180,72,45,${Math.max(0, 1 - t)})`)
        .ringMaxRadius(opts.mini ? 5 : 4).ringPropagationSpeed(2.2).ringRepeatPeriod(1400);

      const ctl = g.controls();
      ctl.autoRotate = !ST.prefersReducedMotion();
      ctl.autoRotateSpeed = opts.mini ? 0.55 : 0.35;
      ctl.enableZoom = !opts.mini;
      if (opts.mini) ctl.enablePan = false;

      // start looking at the chain
      const cx = located();
      const mid = cx.length ? { lat: 32, lng: cx.reduce((s, e) => s + e.lon, 0) / cx.length } : { lat: 25, lng: 60 };
      g.pointOfView({ lat: mid.lat, lng: opts.mini ? 95 : mid.lng, altitude: opts.mini ? 2.1 : 2.3 }, 0);

      const ro = new ResizeObserver(size); ro.observe(host);

      const refresh = () => {
        g.pointsData(pts());
        g.arcsData(arcRels().filter(visRel));
        g.ringsData(rings());
      };

      return {
        globe: g,
        focus(e, ms = 1400, alt) {
          ctl.autoRotate = false;
          g.pointOfView({ lat: e.lat, lng: e.lon, altitude: alt || (opts.mini ? 1.6 : 1.25) }, ms);
          clearTimeout(this._t);
          if (opts.mini) this._t = setTimeout(() => { ctl.autoRotate = !ST.prefersReducedMotion(); }, 6000);
        },
        select(id) { selected = id; g.pointAltitude(g.pointAltitude()); },
        setHighlight(ids) { highlight = ids ? new Set(ids) : null; g.pointColor(g.pointColor()); g.arcColor(g.arcColor()); },
        setFilter(k, v) { filters[k] = v; refresh(); },
        setVisible(ents, rels) { visE = new Set(ents); visR = new Set(rels); refresh(); },
        setLabels(list) {
          g.htmlElementsData(list.filter((x) => ST.entity[x.id] && ST.entity[x.id].lat != null))
            .htmlLat((x) => ST.entity[x.id].lat).htmlLng((x) => ST.entity[x.id].lon).htmlAltitude(0.03)
            .htmlElement((x) => { const wrap = document.createElement("div"); wrap.style.pointerEvents = "none"; wrap.innerHTML = `<div class="globe-tag ${x.cls || ""}"><b>${esc(x.text)}</b>${x.sub ? `<span>${esc(x.sub)}</span>` : ""}</div>`; return wrap; });
        },
        view(lat, lng, alt, ms = 1600) { ctl.autoRotate = false; g.pointOfView({ lat, lng, altitude: alt }, ms); },
        autoRotate(v) { ctl.autoRotate = v; },
        onPoint(fn) { g.onPointClick(fn); },
        onArc(fn) { g.onArcClick(fn); },
        onBg(fn) { g.onGlobeClick(fn); },
        overview(ms = 1400) { g.pointOfView({ lat: mid.lat, lng: mid.lng, altitude: 2.3 }, ms); },
        destroy() {
          ro.disconnect();
          clearTimeout(this._t);
          try { g.pauseAnimation(); } catch (e) {}
          try { g._destructor && g._destructor(); } catch (e) {}
          try { const r = g.renderer(); r.dispose(); r.forceContextLoss && r.forceContextLoss(); } catch (e) {}
          host.innerHTML = "";
        }
      };
    }
  };

  /* ---------------- page ---------------- */
  let kit = null, tourIdx = -1, tourTimer = null;

  function cardForEntity(e) {
    const rels = ST.relsOf(e.id);
    return `<button class="x" aria-label="Close">✕</button>
      <span class="kicker" style="margin:0">${esc(ST.stageById[e.stage]?.label || e.stage)}</span>
      <h2>${esc(ST.name(e))}</h2>
      <p class="muted small">${esc(e.name)}</p>
      ${ST.plain(esc(e.plainRole || e.role || ""))}
      <div class="chips" style="margin-top:12px">${ST.badge(e.status)} ${ST.flagChips(e)}</div>
      <p class="muted small" style="margin-top:10px">${esc([e.city, e.province, e.country].filter(Boolean).join(", "))}${e.approx ? " · approximate location" : ""}</p>
      <div class="panel-h">Links (${rels.length})</div>
      <ul class="rel-list">${rels.slice(0, 8).map((r) => {
        const other = ST.entity[r.from === e.id ? r.to : r.from];
        const dir = r.type === "trade" ? (r.from === e.id ? "supplies" : "buys from") : (r.from === e.id ? "owns" : "owned by");
        return `<li><span class="dot ${r.status}"></span><span>${dir} <a class="ent-link" href="#/company/${other.id}">${esc(ST.name(other))}</a><br><small>${esc(r.label || "")} · ${ST.STATUS[r.status].short}</small></span></li>`;
      }).join("")}</ul>
      <div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
        <a class="btn btn-primary btn-sm" href="#/company/${e.id}">Company file →</a>
        <a class="btn btn-ghost btn-sm" href="#/network?focus=${e.id}">In network</a>
      </div>`;
  }
  function cardForRel(r) {
    const a = ST.entity[r.from], b = ST.entity[r.to];
    return `<button class="x" aria-label="Close">✕</button>
      <span class="kicker" style="margin:0">${r.type === "trade" ? "Trade link" : "Ownership link"}</span>
      <h2>${esc(ST.name(a))} → ${esc(ST.name(b))}</h2>
      ${ST.plain(r.type === "trade" ? `${esc(ST.name(a))} sells to ${esc(ST.name(b))}. ${ST.STATUS[r.status].plain}` : `${esc(ST.name(a))} owns part of ${esc(ST.name(b))}. ${ST.STATUS[r.status].plain}`)}
      <div class="chips">${ST.badge(r.status)} ${(r.hs_codes || []).map((h) => `<span class="flag">HS ${esc(h)}</span>`).join("")}</div>
      <p style="margin-top:12px"><b>${esc(r.label || "")}</b>${r.date_range ? " · " + esc(r.date_range) : ""}</p>
      <p style="margin-top:8px">${esc(r.detail || "")}</p>
      <div class="panel-h">Records</div>${ST.sourceList(r.source_ids)}
      <div class="callout ${r.status}"><b>${ST.STATUS[r.status].label}.</b> ${ST.STATUS[r.status].explain}</div>`;
  }

  function showCard(html) {
    let c = $("#globeCard");
    if (!html) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement("div"); c.id = "globeCard"; c.className = "globe-card card"; $(".page-globe").appendChild(c); }
    c.innerHTML = html;
    $(".x", c).addEventListener("click", () => { showCard(null); kit && kit.select(null); });
  }

  function tourShow(i) {
    const steps = D.story || [];
    if (i < 0 || i >= steps.length) return tourStop();
    tourIdx = i;
    const s = steps[i];
    const ents = (s.focus || []).map((id) => ST.entity[id]).filter(Boolean);
    const geo = ents.find((e) => e.lat != null);
    if (kit) {
      kit.setHighlight(s.highlight || (ents.length ? ents.map((e) => e.id).concat(D.meta.path || []) : null));
      if (geo) kit.focus(geo, 1800, s.altitude || 1.15); else kit.overview(1600);
      kit.select(geo ? geo.id : null);
    }
    showCard(null);
    let c = $("#tourCard");
    if (!c) { c = document.createElement("div"); c.id = "tourCard"; c.className = "tour-card card"; $(".page-globe").appendChild(c); }
    c.innerHTML = `<div><span class="tier">${esc(s.kicker || "")}</span><h3>${esc(s.title)}</h3></div>
      <div class="tour-ctrls"><button type="button" data-t="prev" aria-label="Previous">←</button><button type="button" data-t="next">${i === steps.length - 1 ? "Finish" : "Next →"}</button><button type="button" data-t="stop" aria-label="End tour">✕</button></div>
      <p>${esc(s.body)}</p>
      <div class="dots">${steps.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>`;
    $$("[data-t]", c).forEach((b) => b.addEventListener("click", () => {
      const t = b.dataset.t;
      if (t === "prev") tourShow(Math.max(0, tourIdx - 1));
      else if (t === "next") tourShow(tourIdx + 1);
      else tourStop();
    }));
    const tb = $("#tourBtn"); if (tb) { tb.setAttribute("aria-pressed", "true"); tb.textContent = "Tour running"; }
  }
  function tourStop() {
    tourIdx = -1; clearInterval(tourTimer);
    const c = $("#tourCard"); if (c) c.remove();
    if (kit) { kit.setHighlight(null); kit.select(null); kit.overview(1400); }
    const tb = $("#tourBtn"); if (tb) { tb.setAttribute("aria-pressed", "false"); tb.textContent = "▶ Guided tour"; }
  }

  function render(app, r) {
    const nGap = D.entities.filter((e) => e.lat == null).length;
    app.innerHTML = `
      <div class="globe-host" id="globeHost"><div class="loading" style="position:absolute;inset:0"><div class="spinner"></div><span>Loading the 3D globe…</span></div></div>
      <div class="globe-panel card">
        <span class="kicker" style="margin-bottom:8px">3D trade globe · live data</span>
        <h1>Follow the goods</h1>
        <p class="sub">Each line connects a seller to a buyer. <b style="color:var(--forest-2)">Green</b> = proven, <b style="color:var(--amber-deep)">orange</b> = suspected, grey = unknown. A <b style="color:var(--red)">red pulse</b> means the company is on a US forced-labour blacklist. Click anything.</p>
        <div class="ctrls">
          <div class="row"><button class="btn btn-amber btn-sm" id="tourBtn" type="button" aria-pressed="false">▶ Guided tour</button><button class="btn btn-ghost btn-sm" id="resetBtn" type="button">Reset view</button><button class="btn btn-ghost btn-sm" id="spinBtn" type="button" aria-pressed="true">Spin</button></div>
          <div class="chips"><span class="lbl">Evidence</span>${["verified", "suspected", "missing"].map((s) => `<button class="chip is-on" data-f="${s}" type="button"><i class="sw" style="background:${COLORS[s]}"></i>${ST.STATUS[s].short}</button>`).join("")}</div>
          <div class="chips"><span class="lbl">Links</span><button class="chip is-on" data-f="trade" type="button">Trade</button><button class="chip is-on" data-f="ownership" type="button">Ownership</button></div>
          ${nGap ? `<p class="muted small">${nGap} ${nGap === 1 ? "entity has" : "entities have"} no known location, so they're not on the globe. See <a href="#/companies?status=missing">missing information</a>.</p>` : ""}
        </div>
      </div>
      <div class="globe-legend card">
        ${Object.entries({ silicon: "Silicon", polysilicon: "Polysilicon", wafer: "Wafer", cell: "Cell", module: "Module", importer: "Importer" }).filter(([k]) => D.entities.some((e) => e.stage === k)).map(([k, v]) => `<span><i style="background:${STAGE_COLORS[k]};width:10px;height:10px;border-radius:50%"></i>${v}</span>`).join("")}
        <span><i style="background:#b4482d;width:10px;height:10px;border-radius:50%;box-shadow:0 0 0 3px rgba(180,72,45,.25)"></i>On a US forced-labour blacklist</span>
      </div>`;

    if (!ST.webglOK()) { $("#globeHost").innerHTML = '<div class="fallback" style="padding-top:30vh">This view needs WebGL. Try the <a href="#/network">network</a> or <a href="#/companies">company files</a>.</div>'; return; }

    ST.globeKit.create($("#globeHost"), {}).then((k) => {
      kit = k;
      const l = $("#globeHost .loading"); if (l) l.remove();
      k.onPoint((e) => { tourStop(); k.select(e.id); k.focus(e, 1000, 1.3); showCard(cardForEntity(e)); });
      k.onArc((rel) => { showCard(cardForRel(rel)); });
      k.onBg(() => {});
      if (r.params.focus && ST.entity[r.params.focus]) { const e = ST.entity[r.params.focus]; if (e.lat != null) { k.select(e.id); k.focus(e, 1600, 1.3); } showCard(cardForEntity(e)); }
      if (r.params.tour) setTimeout(() => tourShow(0), 900);
    }).catch((err) => { console.error(err); $("#globeHost").innerHTML = '<div class="fallback" style="padding-top:30vh">Could not load the 3D library. Check your connection.</div>'; });

    $("#tourBtn").addEventListener("click", () => (tourIdx >= 0 ? tourStop() : tourShow(0)));
    $("#resetBtn").addEventListener("click", () => { tourStop(); showCard(null); kit && kit.overview(); });
    $("#spinBtn").addEventListener("click", (e) => { const on = e.currentTarget.getAttribute("aria-pressed") !== "true"; e.currentTarget.setAttribute("aria-pressed", String(on)); kit && kit.autoRotate(on); });
    $$("[data-f]").forEach((b) => b.addEventListener("click", () => { b.classList.toggle("is-on"); kit && kit.setFilter(b.dataset.f, b.classList.contains("is-on")); }));
  }

  ST.pages.globe = {
    title: () => "3D globe",
    render,
    tour: (i) => tourShow(i),
    focus: (id) => { const e = ST.entity[id]; if (kit && e) { if (e.lat != null) kit.focus(e, 1400, 1.3); showCard(cardForEntity(e)); } },
    destroy() { clearInterval(tourTimer); tourIdx = -1; if (kit) kit.destroy(); kit = null; }
  };
})();
