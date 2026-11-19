/* Keyboard shortcut: P (or D) starts the presentation */
(function () {
  ST.initDemo = () => {
    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey) return;
      if ((e.key === "p" || e.key === "P" || e.key === "d" || e.key === "D") && ST.parseHash().name !== "present") ST.go("#/present");
    });
  };
})();
