/* Home: hero globe + scrollytelling + facts */
(function () {
  const { D, esc, $, $$ } = ST;
  let heroGlobe = null, stepObs = null;

  const ICONS = {
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
    network: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7 7.5l3.5 8.5M17 7.5l-3.5 8.5M7.5 6h9"/></svg>',
    companies: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21V8l6-4v17M9 21V10l6-3v14M15 21V12l6-2v11M2 21h20"/></svg>',
    findings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
    timeline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v18M12 7h6M12 12H6M12 17h5"/><circle cx="12" cy="7" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="17" r="1.5"/></svg>',
    method: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h10M4 18h7"/><path d="M16 15l2 2 4-4"/></svg>'
  };

  function render(app) {
    const nEnt = D.entities.filter((e) => e.status !== "missing").length;
    const nRel = D.relationships.length;
    const nSrc = Object.keys(D.sources).length;
    const nCountries = new Set(D.entities.filter((e) => e.status !== "missing").map((e) => e.country)).size;
    const story = D.story || [];
    const facts = (D.facts || []).filter((f) => f.featured).slice(0, 6);

    app.innerHTML = `
      <div class="wrap">
        <section class="hero">
          <div>
            <span class="kicker">A live investigation · ${esc(D.meta.caseShort || "")}</span>
            <h1>Who made the <span class="hl">sunlight?</span></h1>
            <p class="lede">${esc(D.meta.heroLede)}</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="#story">Follow the trail <span aria-hidden="true">↓</span></a>
              <a class="btn btn-amber" href="#/globe">Open the 3D globe →</a>
            </div>
          </div>
          <div class="hero-globe" id="heroGlobe">
            <div class="loading"><div class="spinner"></div></div>
            <div class="globe-host"></div>
            <span class="hero-caption">Drag to spin · each arc is a traced link</span>
          </div>
        </section>
        <div class="hero-stats">
          <div><b data-count="${nEnt}">0</b><span>companies traced</span></div>
          <div><b data-count="${nRel}">0</b><span>links mapped</span></div>
          <div><b data-count="${nCountries}">0</b><span>countries</span></div>
          <div><b data-count="${nSrc}">0</b><span>records &amp; sources cited</span></div>
        </div>

        <section class="section" id="story">
          <header class="section-head rv">
            <span class="kicker">The trail, step by step</span>
            <h2>${esc(D.meta.storyTitle || "From a US port back to Xinjiang")}</h2>
            <p>${esc(D.meta.storyIntro || "")}</p>
          </header>
          <div class="story">
            <div class="story-graphic"><div class="card">
              <div class="ladder" id="ladder"></div>
              <div class="ladder-legend">${["verified", "suspected", "missing"].map((s) => ST.badge(s)).join("")}</div>
            </div></div>
            <div class="steps" id="steps">
              ${story.map((s, i) => `
                <div class="step" data-step="${i}">
                  <div class="card">
                    <span class="tier">${esc(s.kicker || "")}</span>
                    <h3>${esc(s.title)}</h3>
                    <p>${esc(s.body)}</p>
                    <div class="meta">${s.status ? ST.badge(s.status) : ""}${(s.focus || []).slice(0, 3).map((id) => ST.entityLink(id)).join(" · ")}</div>
                    ${s.source_ids && s.source_ids.length ? `<div class="rec">Evidence: ${s.source_ids.slice(0, 3).map((id) => { const x = D.sources[id]; return x ? `${ST.prov(x.provider)} ${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : esc(x.title)}` : ""; }).join("<br>")}</div>` : ""}
                  </div>
                </div>`).join("")}
            </div>
          </div>
        </section>

        ${facts.length ? `
        <section class="section">
          <header class="section-head rv">
            <span class="kicker">The bigger picture · public sources</span>
            <h2>Why polysilicon is the pressure point</h2>
          </header>
          <div class="facts">
            ${facts.map((f) => `<div class="fact rv"><div class="v">${esc(f.stat)}</div><p>${esc(f.statement)}</p>
              <div class="srcs">${(f.source_ids || []).map((id) => { const s = D.sources[id]; return s ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher || s.title)} ↗</a>` : ""; }).join(" · ")}</div></div>`).join("")}
          </div>
        </section>` : ""}

        <section class="section">
          <header class="section-head rv">
            <span class="kicker">How to read SolarTrace</span>
            <h2>Every claim wears its evidence label</h2>
            <p>An investigation goes wrong when a hunch is presented as fact, or when a missing record is read as a clean bill of health. We keep the three apart everywhere: on the globe, in the network and in every finding.</p>
          </header>
          <div class="legend3">
            <div class="card rv"><svg viewBox="0 0 120 18"><line x1="4" y1="9" x2="116" y2="9" stroke="var(--forest-2)"/></svg>${ST.badge("verified")}<p>A record we can point to: a shipment record, registry filing or official government designation.</p></div>
            <div class="card rv"><svg viewBox="0 0 120 18"><line x1="4" y1="9" x2="116" y2="9" stroke="var(--amber)" stroke-dasharray="12 8"/></svg>${ST.badge("suspected")}<p>Indicators point to a link, such as risk annotations, inferred trade relationships or a shared location, but no direct record confirms it.</p></div>
            <div class="card rv"><svg viewBox="0 0 120 18"><line x1="4" y1="9" x2="116" y2="9" stroke="var(--grey)" stroke-dasharray="1 9"/></svg>${ST.badge("missing")}<p>We looked and found nothing. Gaps are shown, not hidden. A gap is not an accusation, but it is not proof of a clean supply chain either.</p></div>
          </div>
        </section>

        <section class="section">
          <header class="section-head rv"><span class="kicker">Explore</span><h2>Six ways into the evidence</h2></header>
          <div class="explore">
            ${[
              ["globe", "#/globe", "3D globe", "Watch goods flow across borders. Take the guided tour from the US port back to the smelter."],
              ["network", "#/network", "3D network", "Rotate the web of ownership and trade. Particles show goods moving through it."],
              ["companies", "#/companies", "Company files", "A profile for every entity: location, flags, links and the records behind them."],
              ["findings", "#/findings", "Findings", "What is verified, what is suspected and what is missing, finding by finding."],
              ["timeline", "#/timeline", "Enforcement timeline", "From the 2021 Withhold Release Order to the latest UFLPA Entity List additions."],
              ["method", "#/method", "Method", "How we classify evidence, where the data comes from and what we can't see."]
            ].map(([ic, href, t, p]) => `<a class="card rv" href="${href}"><span class="ico">${ICONS[ic]}</span><h3>${t}</h3><p>${p}</p><span class="go">Open →</span></a>`).join("")}
          </div>
        </section>
        <div style="height:80px"></div>
      </div>`;

    buildLadder();
    bindStory();
    mountHeroGlobe();
    const sl = $('a[href="#story"]', app);
    sl.addEventListener("click", (e) => { e.preventDefault(); $("#story").scrollIntoView({ behavior: "smooth" }); });
  }

  function buildLadder() {
    const ladder = $("#ladder");
    const stages = D.stages.filter((s) => D.entities.some((e) => e.stage === s.id));
    ladder.innerHTML = stages.map((s) => {
      const ents = D.entities.filter((e) => e.stage === s.id).sort((a, b) => ST.degree(b.id) - ST.degree(a.id)).slice(0, 4);
      return `<div class="rung" data-stage="${s.id}"><span class="st">${esc(s.label)}</span><div class="ents">${ents.map((e) => `<span class="ent ${e.status}" data-ent="${e.id}">${esc(e.short || e.name)}</span>`).join("")}</div></div>`;
    }).join("");
  }

  function setStep(i) {
    const s = (D.story || [])[i]; if (!s) return;
    $$(".step").forEach((el) => el.classList.toggle("active", +el.dataset.step === i));
    const order = D.stages.map((x) => x.id);
    const cur = s.stage ? order.indexOf(s.stage) : -1;
    $$("#ladder .rung").forEach((r) => {
      const idx = order.indexOf(r.dataset.stage);
      r.classList.toggle("now", r.dataset.stage === s.stage);
      r.classList.toggle("lit", cur >= 0 && idx > cur);
    });
    $$("#ladder .ent").forEach((e) => e.classList.toggle("focus", (s.focus || []).includes(e.dataset.ent)));
    if (heroGlobe && s.focus && s.focus.length) {
      const e = ST.entity[s.focus[0]];
      if (e && e.lat != null) heroGlobe.focus(e);
    }
  }

  function bindStory() {
    stepObs = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) setStep(+en.target.dataset.step); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    $$(".step").forEach((el) => stepObs.observe(el));
  }

  function mountHeroGlobe() {
    const box = $("#heroGlobe");
    if (!ST.webglOK()) { $(".loading", box).innerHTML = '<p class="fallback">3D view needs WebGL.</p>'; return; }
    ST.globeKit.create($(".globe-host", box), { mini: true }).then((g) => {
      heroGlobe = g;
      const l = $(".loading", box); if (l) l.remove();
    }).catch(() => { $(".loading", box).innerHTML = '<p class="fallback">Could not load the 3D globe.</p>'; });
  }

  ST.pages.home = {
    title: () => "Who made the sunlight?",
    render,
    scrollToStory: () => $("#story")?.scrollIntoView({ behavior: "smooth" }),
    destroy() { if (stepObs) stepObs.disconnect(); if (heroGlobe) heroGlobe.destroy(); heroGlobe = null; }
  };
})();
