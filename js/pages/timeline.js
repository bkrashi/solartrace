/* Enforcement timeline */
(function () {
  const { D, esc } = ST;
  function render(app) {
    const items = [...(D.timeline || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    let lastYear = null, html = "", k = 0;
    items.forEach((t) => {
      const y = String(t.date).slice(0, 4);
      if (y !== lastYear) { html += `<div class="tl-year rv"><span>${esc(y)}</span></div>`; lastYear = y; }
      html += `<div class="tl-item rv ${k++ % 2 ? "right" : ""}"><div class="card"><span class="date">${esc(ST.fmtDate(t.date))}</span><p>${esc(t.event)}</p>${ST.sourceList(t.source_ids)}</div></div>`;
    });
    app.innerHTML = `<div class="wrap">
      <header class="page-head">
        <span class="kicker">Enforcement timeline · public sources</span>
        <h1>How solar became the front line</h1>
        ${ST.plain("Researchers found forced labour in Xinjiang's solar industry in 2021. The US then banned those goods, and solar became the most-stopped product at the border.")}
      </header>
      <div class="tl">${html}</div>
    </div>`;
  }
  ST.pages.timeline = { title: () => "Timeline", render };
})();
