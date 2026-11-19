/* Boot */
(function () {
  const { D, $ } = ST;
  function boot() {
    $("#livePillText").textContent = `Live data · ${ST.fmtDate(D.meta.retrieved)}`;
    $("#footerProvenance").textContent = ` Data retrieved ${ST.fmtDate(D.meta.retrieved)} from Sayari, Tradeverifyd and Tavily.`;
    $("#menuBtn").addEventListener("click", () => {
      const open = !document.body.classList.contains("menu-open");
      document.body.classList.toggle("menu-open", open);
      $("#menuBtn").setAttribute("aria-expanded", String(open));
    });
    ST.initDemo();
    window.addEventListener("hashchange", ST.route);
    ST.route();
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();
})();
