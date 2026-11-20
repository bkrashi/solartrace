/* SolarTrace core: data index, helpers, lazy loader, router */
(function () {
  "use strict";
  const D = window.SOLARTRACE;
  const ST = (window.ST = { D, pages: {}, current: null });

  /* ---------- DOM helpers ---------- */
  ST.$ = (s, el = document) => el.querySelector(s);
  ST.$$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  ST.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  ST.h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content; };

  /* ---------- vocab ---------- */
  ST.STATUS = {
    verified: { label: "Proven", short: "Proven", tech: "Verified record", color: "#2e6447", plain: "We have the paperwork.", explain: "We have the paperwork: shipping records, company filings or a government list." },
    suspected: { label: "Suspected", short: "Suspected", tech: "Suspected exposure", color: "#d4901a", plain: "Clues point here, no paperwork yet.", explain: "Clues point to this link, like trade data or warning flags, but no paperwork proves it." },
    missing: { label: "Unknown", short: "Unknown", tech: "Missing information", color: "#8b8a80", plain: "We looked and found nothing.", explain: "We looked and found no record. That's a gap, not a verdict." }
  };
  ST.name = (e) => (e ? e.plain || e.short || e.name : "");
  ST.PROVIDER = { sayari: "Sayari", tradeverifyd: "Tradeverifyd", tavily: "Tavily", derived: "Derived", editorial: "SolarTrace" };
  ST.STAGES = D.stages;
  ST.stageById = Object.fromEntries(D.stages.map((s, i) => [s.id, { ...s, index: i }]));

  /* ---------- data index ---------- */
  ST.entity = Object.fromEntries(D.entities.map((e) => [e.id, e]));
  ST.rel = Object.fromEntries(D.relationships.map((r) => [r.id, r]));
  ST.relsOf = (id) => D.relationships.filter((r) => r.from === id || r.to === id);
  ST.degree = (id) => ST.relsOf(id).length;
  ST.source = (id) => D.sources[id];
  ST.isFlagged = (e) => (e.flags || []).some((f) => /uflpa|withhold|wro|entity list|sanction/i.test(f.label));
  ST.findingsFor = (id) => (D.findings || []).filter((f) => (f.focus?.entities || []).includes(id));
  ST.countries = () => [...new Set(D.entities.map((e) => e.country).filter(Boolean))];
  ST.pathRels = () => {
    const p = D.meta.path || [], out = [];
    for (let i = 0; i < p.length - 1; i++) {
      const r = D.relationships.find((x) => (x.from === p[i + 1] && x.to === p[i]) || (x.from === p[i] && x.to === p[i + 1]));
      if (r) out.push(r);
    }
    return out;
  };

  /* ---------- HTML fragments ---------- */
  ST.badge = (status, text) => `<span class="badge badge-${status}">${ST.esc(text || ST.STATUS[status].label)}</span>`;
  ST.prov = (p) => `<span class="prov prov-${p}">${ST.esc(ST.PROVIDER[p] || p)}</span>`;
  ST.flagChips = (e) => (e.flags || []).map((f) => `<span class="flag ${/uflpa|withhold|wro|entity list|sanction/i.test(f.label) ? "flag-hot" : ""}" title="${ST.esc(f.detail || "")}">${ST.esc(f.label)}</span>`).join("");
  ST.entityLink = (id) => { const e = ST.entity[id]; return e ? `<a class="ent-link" href="#/company/${e.id}">${ST.esc(e.short || e.name)}</a>` : ST.esc(id); };
  ST.sourceItem = (id) => {
    const s = D.sources[id];
    if (!s) return "";
    const ref = s.record_id ? `<code>${ST.esc(s.record_id)}</code>` : "";
    const title = s.url ? `<a href="${ST.esc(s.url)}" target="_blank" rel="noopener">${ST.esc(s.title)} ↗</a>` : `<span>${ST.esc(s.title)}</span>`;
    const pub = s.publisher ? `<span class="muted">${ST.esc(s.publisher)}${s.date ? ", " + ST.esc(s.date) : ""}</span>` : "";
    return `<li class="src-item">${ST.prov(s.provider)} ${title} ${ref} ${pub}</li>`;
  };
  ST.sourceList = (ids) => {
    const items = (ids || []).map(ST.sourceItem).filter(Boolean);
    return items.length ? `<ul class="src-list">${items.join("")}</ul>` : `<p class="muted small">No record found. That absence is part of the finding.</p>`;
  };
  ST.fmtDate = (s) => {
    if (!s) return "";
    const m = String(s).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
    if (!m) return s;
    const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (!m[2]) return m[1];
    if (!m[3]) return `${M[+m[2] - 1]} ${m[1]}`;
    return `${+m[3]} ${M[+m[2] - 1]} ${m[1]}`;
  };

  /* ---------- key-sentence callouts + glossary ---------- */
  ST.plain = (text) => text ? `<p class="plain"><svg class="plain-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g></svg><span>${text}</span></p>` : "";
  ST.term = (key, text) => `<span class="term" tabindex="0" data-term="${key}">${text}</span>`;
  // auto-link glossary words in a plain-text string (first occurrence of each)
  ST.withTerms = (txt) => {
    let out = ST.esc(txt);
    const map = { polysilicon: "polysilicon", wafers: "wafer", wafer: "wafer", "UFLPA": "uflpa", "Xinjiang": "xinjiang", "blacklist": "entity-list", "Entity List": "entity-list" };
    const done = new Set();
    Object.keys(map).forEach((w) => {
      if (done.has(map[w])) return;
      const re = new RegExp(`\\b(${w})\\b`);
      if (re.test(out)) { out = out.replace(re, `<span class="term" tabindex="0" data-term="${map[w]}">$1</span>`); done.add(map[w]); }
    });
    return out;
  };
  const termTip = (el) => { const d = (D.glossary || {})[el.dataset.term]; if (!d) return; const r = el.getBoundingClientRect(); ST.showTip(r.left, r.bottom - 6, `<b>${ST.esc(el.textContent)}</b><br>${ST.esc(d)}`); };
  document.addEventListener("mouseover", (e) => { const t = e.target.closest && e.target.closest(".term"); if (t) termTip(t); });
  document.addEventListener("mouseout", (e) => { if (e.target.closest && e.target.closest(".term")) ST.hideTip(); });
  document.addEventListener("focusin", (e) => { const t = e.target.closest && e.target.closest(".term"); if (t) termTip(t); });
  document.addEventListener("focusout", (e) => { if (e.target.closest && e.target.closest(".term")) ST.hideTip(); });

  /* ---------- tooltip ---------- */
  const tip = () => document.getElementById("tooltip");
  ST.showTip = (x, y, html) => {
    const t = tip(); t.innerHTML = html; t.hidden = false;
    const w = t.offsetWidth, hh = t.offsetHeight;
    let left = x + 14, top = y + 14;
    if (left + w > innerWidth - 8) left = x - w - 14;
    if (top + hh > innerHeight - 8) top = y - hh - 14;
    t.style.left = left + "px"; t.style.top = top + "px";
  };
  ST.hideTip = () => { tip().hidden = true; };

  /* ---------- lazy CDN loader ---------- */
  const loaded = {};
  ST.loadScript = (src) => loaded[src] || (loaded[src] = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.async = true; s.onload = res; s.onerror = () => { delete loaded[src]; rej(new Error("Failed to load " + src)); };
    document.head.appendChild(s);
  }));
  ST.LIB = {
    globe: "https://cdn.jsdelivr.net/npm/globe.gl@2.46.1/dist/globe.gl.min.js",
    graph: "https://cdn.jsdelivr.net/npm/3d-force-graph@1.80.0/dist/3d-force-graph.min.js",
    topo: "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js",
    world: "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json"
  };
  let worldP;
  ST.world = () => worldP || (worldP = ST.loadScript(ST.LIB.topo)
    .then(() => fetch(ST.LIB.world)).then((r) => r.json())
    .then((topo) => window.topojson.feature(topo, topo.objects.countries).features));

  ST.prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  ST.webglOK = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } };

  /* ---------- reveal-on-scroll ---------- */
  let io;
  ST.reveal = (root) => {
    io = io || new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: 0, rootMargin: "0px 0px -6% 0px" });
    ST.$$(".rv", root).forEach((el) => io.observe(el));
  };

  /* ---------- count-up ---------- */
  ST.countUp = (root) => ST.$$("[data-count]", root).forEach((el) => {
    const end = +el.dataset.count, dur = 1200, t0 = performance.now();
    if (ST.prefersReducedMotion()) { el.textContent = end; return; }
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });

  /* ---------- router ---------- */
  ST.parseHash = () => {
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, q] = raw.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = Object.fromEntries(new URLSearchParams(q || ""));
    return { name: parts[0] || "home", arg: parts[1] ? decodeURIComponent(parts[1]) : null, params };
  };
  ST.go = (hash) => { if (location.hash === hash) ST.route(); else location.hash = hash; };

  ST.route = () => {
    const r = ST.parseHash();
    let name = r.name === "company" ? "company" : r.name;
    if (!ST.pages[name]) name = "home";
    const app = document.getElementById("app");
    if (ST.current && ST.current.destroy) { try { ST.current.destroy(); } catch (e) { console.warn(e); } }
    ST.hideTip();
    app.innerHTML = "";
    app.className = "page page-" + name;
    document.body.dataset.page = name;
    ST.current = ST.pages[name];
    const navName = name === "company" ? "companies" : name;
    ST.$$("#nav a").forEach((a) => { const on = a.dataset.route === navName; a.classList.toggle("is-active", on); on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"); });
    document.body.classList.remove("menu-open");
    ST.$("#menuBtn").setAttribute("aria-expanded", "false");
    if (!ST.keepScroll) window.scrollTo(0, 0);
    ST.keepScroll = false;
    ST.current.render(app, r);
    document.title = (ST.current.title ? ST.current.title(r) + " · " : "") + "SolarTrace";
    ST.reveal(app);
    ST.countUp(app);
    window.dispatchEvent(new CustomEvent("st:routed", { detail: r }));
  };
})();
