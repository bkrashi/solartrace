/* 3-minute presenter mode */
(function () {
  const { D, $ } = ST;
  const path = D.meta.path || [];
  const origin = path[path.length - 1];
  const spot = D.meta.spotlight || origin;
  const importer = ST.entity[path[0]];
  const nameOf = (id) => ST.entity[id]?.short || ST.entity[id]?.name || "";

  const STEPS = [
    { at: 0, text: `<b>The hook.</b> Nearly every solar panel starts as polysilicon, and a large share of it comes from Xinjiang. This is a real chain, traced with live data.`, run: () => ST.go("#/") },
    { at: 20, text: `<b>The trail.</b> Scroll the story: we start at <b>${nameOf(path[0])}</b>, a US importer, and walk back tier by tier.`, run: () => { ST.go("#/"); setTimeout(() => ST.pages.home.scrollToStory(), 400); } },
    { at: 45, text: `<b>The globe.</b> Each arc is a traced link. The guided tour flies from the US port back toward Xinjiang.`, run: () => { ST.go("#/globe?tour=1"); } },
    { at: 75, text: `<b>Where it turns red.</b> Pulsing rings mark companies on the US UFLPA Entity List. The evidence label on each link tells you how sure we are.`, run: () => { if (ST.parseHash().name !== "globe") ST.go("#/globe"); setTimeout(() => ST.pages.globe.tour(Math.max(0, (D.story || []).length - 3)), 600); } },
    { at: 100, text: `<b>The network.</b> Ownership and trade in 3D. Trace the main path; particles show goods flowing to the importer.`, run: () => ST.go("#/network?path=1") },
    { at: 125, text: `<b>Company file.</b> Every company has a profile with its flags, its links and the record IDs behind them.`, run: () => ST.go("#/company/" + spot) },
    { at: 145, text: `<b>Findings.</b> Each finding splits into verified, suspected and missing. Gaps are shown, not hidden.`, run: () => ST.go("#/findings") },
    { at: 165, text: `<b>Live data.</b> Pulled from Sayari, Tradeverifyd and Tavily. Re-run the investigation and the whole site regenerates.`, run: () => ST.go("#/sources") }
  ];
  const TOTAL = 180;
  const demo = (ST.demo = { on: false, i: 0, t0: 0, timer: null });
  const fmt = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  function show(i) {
    demo.i = Math.max(0, Math.min(STEPS.length - 1, i));
    const s = STEPS[demo.i];
    $("#demoText").innerHTML = s.text;
    $("#demoCount").textContent = `Step ${demo.i + 1} / ${STEPS.length} · cue ${fmt(s.at)}`;
    $("#demoNext").textContent = demo.i === STEPS.length - 1 ? "Finish" : "Next →";
    s.run();
  }
  function tick() {
    const el = (Date.now() - demo.t0) / 1000, left = TOTAL - el;
    $("#demoTime").textContent = left >= 0 ? fmt(left) : "+" + fmt(-left);
    $(".demo-clock").classList.toggle("over", left < 0);
    $("#demoProgress").style.width = Math.min(100, (el / TOTAL) * 100) + "%";
  }
  function start() { demo.on = true; demo.t0 = Date.now(); $("#demoBar").hidden = false; $("#demoToggle").setAttribute("aria-pressed", "true"); show(0); tick(); demo.timer = setInterval(tick, 500); }
  function stop() { demo.on = false; clearInterval(demo.timer); $("#demoBar").hidden = true; $("#demoToggle").setAttribute("aria-pressed", "false"); }

  ST.initDemo = () => {
    $("#demoToggle").addEventListener("click", () => (demo.on ? stop() : start()));
    $("#demoNext").addEventListener("click", () => (demo.i === STEPS.length - 1 ? stop() : show(demo.i + 1)));
    $("#demoPrev").addEventListener("click", () => show(demo.i - 1));
    $("#demoClose").addEventListener("click", stop);
    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "d" || e.key === "D") { demo.on ? stop() : start(); return; }
      if (!demo.on) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); $("#demoNext").click(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); show(demo.i - 1); }
      else if (e.key === "Escape") stop();
    });
  };
})();
