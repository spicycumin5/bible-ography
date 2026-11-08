/* Detail drawer: slides in from the right with a tab per section, so the page underneath never has to scroll.
   setup(sections, {base, label}) registers a page's sections: [{id, title, html, after(body) -> [maps]}].
   open(id) shows one; close() hides it. The URL tracks the open section (#/genesis/22/words) without reloading. */
(function () {
  let root, panel, tabs, body, ctx, state = null, lastFocus = null;

  function ensure() {
    if (root) return;
    root = document.createElement("div");
    root.className = "drawer";
    root.hidden = true;
    root.innerHTML =
      '<div class="dr-backdrop" data-close></div>' +
      '<aside class="dr-panel" role="dialog" aria-modal="true" aria-labelledby="dr-title" tabindex="-1">' +
        '<header class="dr-head">' +
          '<div class="dr-top"><p class="dr-ctx" id="dr-title"></p><button type="button" class="dr-close" data-close>Close</button></div>' +
          '<nav class="dr-tabs" role="tablist" aria-label="Sections"></nav>' +
        "</header>" +
        '<div class="dr-body" role="tabpanel"></div>' +
      "</aside>";
    document.body.appendChild(root);
    panel = root.querySelector(".dr-panel");
    tabs = root.querySelector(".dr-tabs");
    body = root.querySelector(".dr-body");
    ctx = root.querySelector(".dr-ctx");
    root.addEventListener("click", e => { if (e.target.closest("[data-close]")) close(); });
    tabs.addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) open(b.dataset.tab); });
    tabs.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault(); e.stopPropagation();
      const ids = state.sections.map(s => s.id), i = ids.indexOf(state.current);
      const next = ids[(i + (e.key === "ArrowRight" ? 1 : ids.length - 1)) % ids.length];
      open(next);
      const t = tabs.querySelector('[data-tab="' + next + '"]'); if (t) t.focus();
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen()) close(); });
    // links inside the drawer that go to another page should close it first
    body.addEventListener("click", e => {
      const a = e.target.closest("a[href^='#/']");
      if (a) { clearMaps(); root.hidden = true; document.body.classList.remove("dr-open"); state && (state.current = null); }
    });
  }

  function clearMaps() {
    if (state) (state.maps || []).forEach(m => BIBLE.map.destroy(m));
    if (state) state.maps = [];
  }

  function setup(sections, opts) {
    ensure();
    const wasOpen = isOpen() ? state.current : null;
    clearMaps();
    state = { sections, base: opts.base, label: opts.label, maps: [], current: null };
    ctx.textContent = opts.label;
    tabs.innerHTML = sections.map(s => '<button type="button" role="tab" data-tab="' + s.id + '" aria-selected="false">' + BIBLE.refs.esc(s.tab || s.title) + "</button>").join("");
    if (!wasOpen) { root.hidden = true; document.body.classList.remove("dr-open"); }
    return wasOpen;
  }

  function open(id, opts) {
    ensure();
    if (!state) return;
    const sec = state.sections.find(s => s.id === id) || state.sections[0];
    if (!sec) return;
    if (!isOpen()) lastFocus = document.activeElement;
    clearMaps();
    state.current = sec.id;
    tabs.querySelectorAll("[data-tab]").forEach(b => {
      const on = b.dataset.tab === sec.id;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      if (on) b.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    body.innerHTML = "<h2>" + BIBLE.refs.esc(sec.title) + "</h2>" + sec.html;
    body.scrollTop = 0;
    root.hidden = false;
    document.body.classList.add("dr-open");
    requestAnimationFrame(() => {
      root.classList.add("in");
      const maps = sec.after ? sec.after(body) : null;
      state.maps = (maps || []).filter(Boolean);
    });
    if (!(opts && opts.silent)) history.replaceState(null, "", state.base + "/" + sec.id);
    if (!(opts && opts.keepFocus)) panel.focus({ preventScroll: true });
  }

  function close() {
    if (!root || root.hidden) return;
    clearMaps();
    root.classList.remove("in");
    root.hidden = true;
    document.body.classList.remove("dr-open");
    if (state) { state.current = null; history.replaceState(null, "", state.base); }
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  /* Hide without touching the URL (used when the app navigates to a different page). */
  function reset() {
    if (!root) return;
    clearMaps();
    root.classList.remove("in");
    root.hidden = true;
    document.body.classList.remove("dr-open");
    if (state) state.current = null;
  }

  const isOpen = () => !!(root && !root.hidden);
  const current = () => (isOpen() && state ? state.current : null);

  BIBLE.drawer = { setup, open, close, reset, isOpen, current };
})();
