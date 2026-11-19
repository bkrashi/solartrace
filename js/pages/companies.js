/* Company directory + profile pages */
(function () {
  const { D, esc, $, $$ } = ST;
  const STAGE_ORDER = ["importer", "module", "cell", "wafer", "polysilicon", "silicon", "holding", "owner"];

  /* ---------- directory ---------- */
  function renderList(app, r) {
    const q = { text: "", stage: r.params.stage || "all", status: r.params.status || "all", flagged: r.params.flagged === "1" };
    const stages = STAGE_ORDER.filter((s) => D.entities.some((e) => e.stage === s));
    app.innerHTML = `<div class="wrap">
      <header class="page-head">
        <span class="kicker">Company files · ${D.entities.length} entities</span>
        <h1>Everyone in the chain</h1>
        ${ST.plain("One card per company in the chain. Click any card to see what it does, who it trades with, and the proof.")}
      </header>
      <div class="toolbar">
        <label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg><input id="q" type="search" placeholder="Search companies, cities, countries…" aria-label="Search companies" /></label>
        <div class="chips" id="stageChips"><span class="lbl">Tier</span><button type="button" class="chip" data-stage="all">All</button>${stages.map((s) => `<button type="button" class="chip" data-stage="${s}">${esc(ST.stageById[s].label)}</button>`).join("")}</div>
        <div class="chips" id="statusChips"><span class="lbl">Evidence</span><button type="button" class="chip" data-status="all">All</button>${["verified", "suspected", "missing"].map((s) => `<button type="button" class="chip" data-status="${s}">${ST.STATUS[s].short}</button>`).join("")}<button type="button" class="chip" id="flagChip">⚑ On a US list</button></div>
      </div>
      <div class="ent-grid" id="grid"></div>
    </div>`;

    const draw = () => {
      $$("#stageChips .chip").forEach((c) => c.classList.toggle("is-on", c.dataset.stage === q.stage));
      $$("#statusChips [data-status]").forEach((c) => c.classList.toggle("is-on", c.dataset.status === q.status));
      $("#flagChip").classList.toggle("is-on", q.flagged);
      const t = q.text.toLowerCase();
      const list = D.entities
        .filter((e) => (q.stage === "all" || e.stage === q.stage) && (q.status === "all" || e.status === q.status) && (!q.flagged || ST.isFlagged(e)))
        .filter((e) => !t || [e.name, e.short, e.city, e.province, e.country, e.role].join(" ").toLowerCase().includes(t))
        .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || ST.degree(b.id) - ST.degree(a.id));
      $("#grid").innerHTML = list.map((e) => `
        <a class="ent-card card ${e.status}" href="#/company/${e.id}">
          <span class="stage">${esc(ST.stageById[e.stage]?.label || e.stage)}</span>
          <h3>${esc(ST.name(e))}</h3>
          <span class="loc">${esc(e.short || e.name)}</span>
          <span class="loc">${esc([e.city, e.province, e.country].filter(Boolean).join(", ") || "Location unknown")}</span>
          <div class="flags">${ST.badge(e.status)}${ST.flagChips(e)}</div>
          <div class="foot"><span>${ST.degree(e.id)} links · ${(e.source_ids || []).length} records</span><span>Open →</span></div>
        </a>`).join("") || `<p class="empty">No companies match these filters.</p>`;
    };
    $("#q").addEventListener("input", (e) => { q.text = e.target.value; draw(); });
    $$("#stageChips [data-stage]").forEach((c) => c.addEventListener("click", () => { q.stage = c.dataset.stage; draw(); }));
    $$("#statusChips [data-status]").forEach((c) => c.addEventListener("click", () => { q.status = c.dataset.status; draw(); }));
    $("#flagChip").addEventListener("click", () => { q.flagged = !q.flagged; draw(); });
    draw();
  }

  /* ---------- mini map ---------- */
  function ringPath(ring, W, H, off) {
    return ring.map(([lon, lat], i) => `${i ? "L" : "M"}${(((lon + off + 180) / 360) * W).toFixed(1)} ${(((90 - lat) / 180) * H).toFixed(1)}`).join("") + "Z";
  }
  function drawMiniMap(svg, e) {
    const others = ST.relsOf(e.id).map((r) => ST.entity[r.from === e.id ? r.to : r.from]).filter((o) => o && o.lat != null);
    const pts = [e, ...others].filter((x) => x.lat != null);
    if (!pts.length) { svg.parentElement.innerHTML = '<p class="muted small">No known location.</p>'; return; }
    const W = 720, H = 360;
    const lons = pts.map((p) => p.lon);
    const shift = Math.max(...lons) - Math.min(...lons) > 180; // center on Pacific
    const L = (lon) => (shift && lon < 0 ? lon + 360 : lon);
    const X = (lon) => ((L(lon) + 180) / 360) * W, Y = (lat) => ((90 - lat) / 180) * H;
    let x0 = Math.min(...pts.map((p) => X(p.lon))), x1 = Math.max(...pts.map((p) => X(p.lon)));
    let y0 = Math.min(...pts.map((p) => Y(p.lat))), y1 = Math.max(...pts.map((p) => Y(p.lat)));
    const pad = 40; x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
    let w = Math.max(x1 - x0, 140), h = Math.max(y1 - y0, 90);
    if (w / h > 2.2) { const nh = w / 2.2; y0 -= (nh - h) / 2; h = nh; } else if (w / h < 1.4) { const nw = h * 1.4; x0 -= (nw - w) / 2; w = nw; }
    svg.setAttribute("viewBox", `${x0} ${y0} ${w} ${h}`);
    ST.world().then((features) => {
      const offs = shift ? [0, 360] : [0];
      let paths = "";
      features.forEach((f) => {
        const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
        const on = String(f.id) === String(e.country_iso) ? "on" : "";
        offs.forEach((o) => { paths += `<path class="${on}" d="${polys.map((p) => ringPath(p[0], W, H, o)).join("")}"/>`; });
      });
      const lines = others.map((o) => {
        const r = ST.relsOf(e.id).find((x) => x.from === o.id || x.to === o.id);
        const c = ST.STATUS[r.status].color;
        const ax = X(e.lon), ay = Y(e.lat), bx = X(o.lon), by = Y(o.lat);
        const mx = (ax + bx) / 2, my = (ay + by) / 2 - Math.hypot(bx - ax, by - ay) * 0.25;
        return `<path d="M${ax} ${ay}Q${mx} ${my} ${bx} ${by}" fill="none" stroke="${c}" stroke-width="${w / 260}" ${r.status !== "verified" ? `stroke-dasharray="${w / 90} ${w / 140}"` : ""}/><circle cx="${bx}" cy="${by}" r="${w / 160}" fill="${c}"><title>${esc(o.name)}</title></circle>`;
      }).join("");
      svg.innerHTML = paths + lines + `<circle cx="${X(e.lon)}" cy="${Y(e.lat)}" r="${w / 70}" fill="var(--amber)" opacity=".3"/><circle cx="${X(e.lon)}" cy="${Y(e.lat)}" r="${w / 120}" fill="var(--forest)" stroke="#fff" stroke-width="${w / 400}"/>`;
    }).catch(() => {});
  }

  /* ---------- profile ---------- */
  function renderProfile(app, r) {
    const e = ST.entity[r.arg];
    if (!e) { app.innerHTML = `<div class="wrap page-head"><h1>Company not found</h1><p class="sub"><a href="#/companies">Back to all companies</a></p></div>`; return; }
    const rels = ST.relsOf(e.id);
    const up = rels.filter((x) => (x.type === "trade" && x.to === e.id));
    const down = rels.filter((x) => (x.type === "trade" && x.from === e.id));
    const own = rels.filter((x) => x.type !== "trade");
    const tiers = ["silicon", "polysilicon", "wafer", "cell", "module", "importer"];
    const ti = tiers.indexOf(e.stage);
    const findings = ST.findingsFor(e.id);
    const relRow = (x, dir) => {
      const o = ST.entity[x.from === e.id ? x.to : x.from];
      return `<li><span class="dot ${x.status}"></span><span>${dir} ${ST.entityLink(o.id)} <small>· ${esc(o.country || "")}</small><br><small>${esc(x.label || "")}${x.hs_codes && x.hs_codes.length ? " · HS " + esc(x.hs_codes.join(", ")) : ""}${x.date_range ? " · " + esc(x.date_range) : ""} · ${ST.STATUS[x.status].short}</small>${x.detail ? `<br><small>${esc(x.detail)}</small>` : ""}</span></li>`;
    };

    app.innerHTML = `<div class="wrap">
      <nav class="crumbs"><a href="#/companies">Company files</a> / ${esc(e.short || e.name)}</nav>
      <header class="profile-head">
        <div>
          <span class="kicker">${esc(ST.stageById[e.stage]?.label || e.stage)}</span>
          <h1>${esc(ST.name(e))}</h1>
          <p class="reg-name">Registered name: ${esc(e.name)}${e.alias ? ` · also listed as ${esc(e.alias)}` : ""}</p>
          ${ST.plain(esc(e.plainRole || "") + (ST.isFlagged(e) && !/list/i.test(e.plainRole || "") ? " <b>It is on a US government blacklist.</b>" : ""))}
          <div class="meta">${ST.badge(e.status)} ${ST.flagChips(e)} <span class="muted">${esc([e.city, e.province, e.country].filter(Boolean).join(", "))}</span></div>
        </div>
        <div class="profile-actions">
          ${e.lat != null ? `<a class="btn btn-primary btn-sm" href="#/globe?focus=${e.id}">See on globe</a>` : ""}
          <a class="btn btn-ghost btn-sm" href="#/network?focus=${e.id}">See in network</a>
        </div>
      </header>
      <div class="profile-grid">
        <div>
          <div class="card rv">
            <h3>Role in the chain</h3>
            <p style="margin-top:10px">${esc(e.role || "")}</p>
            ${ti >= 0 ? `<div style="margin-top:18px"><div class="tier-strip" style="--n:${tiers.length}">${tiers.map((t, i) => `<div class="${i === ti ? "on" : ""}"></div>`).join("")}</div><div class="tier-strip-l" style="--n:${tiers.length}">${tiers.map((t) => `<span>${esc(ST.stageById[t].label)}</span>`).join("")}</div></div>` : ""}
            <div class="callout ${e.status}"><b>${ST.STATUS[e.status].label}.</b> ${ST.STATUS[e.status].explain}</div>
          </div>
          ${up.length ? `<div class="card rv"><h3>Buys from (upstream)</h3><ul class="rel-list" style="margin-top:12px">${up.map((x) => relRow(x, "")).join("")}</ul></div>` : ""}
          ${down.length ? `<div class="card rv"><h3>Sells to (downstream)</h3><ul class="rel-list" style="margin-top:12px">${down.map((x) => relRow(x, "")).join("")}</ul></div>` : ""}
          ${own.length ? `<div class="card rv"><h3>Ownership &amp; control</h3><ul class="rel-list" style="margin-top:12px">${own.map((x) => relRow(x, x.from === e.id ? "Owns" : "Owned by")).join("")}</ul></div>` : ""}
          ${findings.length ? `<div class="card rv"><h3>Appears in findings</h3><ul class="rel-list" style="margin-top:12px">${findings.map((f) => `<li><span class="dot ${f.status}"></span><span><a class="ent-link" href="#/findings?f=${f.id}">${esc(f.id)}: ${esc(f.title)}</a></span></li>`).join("")}</ul></div>` : ""}
        </div>
        <div>
          <div class="card rv"><h3>Where</h3><div style="margin-top:12px"><svg class="mini-map" id="miniMap" role="img" aria-label="Map of ${esc(e.name)} and linked companies"></svg></div>
            <dl class="kv" style="margin-top:14px">
              <dt>Location</dt><dd>${esc([e.city, e.province, e.country].filter(Boolean).join(", ") || "Unknown")}${e.approx ? " <span class='muted small'>(approximate)</span>" : ""}</dd>
              ${e.sayari_id ? `<dt>Sayari ID</dt><dd><code>${esc(e.sayari_id)}</code></dd>` : ""}
              ${e.tradeverifyd_id ? `<dt>Tradeverifyd ID</dt><dd><code>${esc(e.tradeverifyd_id)}</code></dd>` : ""}
            </dl>
          </div>
          ${(e.flags || []).length ? `<div class="card rv"><h3>Flags &amp; risk signals</h3><ul class="flag-list" style="margin-top:12px">${e.flags.map((f) => `<li class="${/uflpa|withhold|wro|entity list|sanction/i.test(f.label) ? "hot" : ""}"><b>${esc(f.label)}</b>${esc(f.detail || "")}${(f.source_ids || []).length ? `<div style="margin-top:6px">${ST.sourceList(f.source_ids)}</div>` : ""}</li>`).join("")}</ul></div>` : ""}
          <div class="card rv"><h3>Records</h3><div style="margin-top:12px">${ST.sourceList(e.source_ids)}</div></div>
        </div>
      </div>
    </div>`;
    drawMiniMap($("#miniMap"), e);
  }

  ST.pages.companies = { title: () => "Company files", render: renderList };
  ST.pages.company = { title: (r) => (ST.entity[r.arg]?.short || "Company"), render: renderProfile };
})();
