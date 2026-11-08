/* Leaflet maps for chapter settings. */
(function () {
  const TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}";
  const live = [];

  function destroyAll() {
    while (live.length) { try { live.pop().remove(); } catch (e) {} }
  }

  function esc(s) { return BIBLE.refs.esc(s || ""); }

  function popupHtml(p, extra) {
    const certainty = {
      known: "Location known",
      probable: "Location probable",
      uncertain: "Location uncertain",
    }[p.certainty || "known"];
    return '<div class="pop"><strong>' + esc(p.name) + "</strong>" +
      (p.modern ? '<span class="pop-modern">' + esc(p.modern) + "</span>" : "") +
      (extra ? '<p class="pop-role">' + esc(extra) + "</p>" : "") +
      (p.note ? "<p>" + esc(p.note) + "</p>" : "") +
      '<span class="pop-cert cert-' + (p.certainty || "known") + '">' + certainty + "</span>" +
      '<a class="pop-link" href="#/places/' + p.id + '">Every chapter set here</a></div>';
  }

  /* opts: { places:[{id, role}], journeys:[{label, path:[ids]}], height, interactive } */
  function render(el, opts) {
    if (!window.L) { el.innerHTML = '<p class="empty">The map needs an internet connection to load.</p>'; return null; }
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--rubric").trim() || "#a33";
    const lapis = css.getPropertyValue("--lapis").trim() || "#235";
    const still = opts.static === true;   // tile previews: no panning, zooming or popups
    const map = L.map(el, {
      zoomControl: !still, scrollWheelZoom: false, attributionControl: !still,
      dragging: !still, doubleClickZoom: !still, boxZoom: !still, keyboard: !still, touchZoom: !still,
      minZoom: 3, maxZoom: 8, worldCopyJump: false,
    });
    live.push(map);
    L.tileLayer(TILE, {
      maxZoom: 8, className: "tiles",
      attribution: "Relief © Esri, US National Park Service",
    }).addTo(map);
    if (!still) el.addEventListener("click", () => map.scrollWheelZoom.enable(), { once: true });

    const pts = [];
    for (const item of opts.places || []) {
      const p = BIBLE.places[item.id];
      if (!p) { console.warn("Unknown place", item.id); continue; }
      p.id = item.id;
      const ll = [p.lat, p.lng];
      if (p.type === "region") {
        const rm = L.marker(ll, {
          icon: L.divIcon({ className: "region-label", html: "<span>" + esc(p.name) + "</span>", iconSize: null }),
          keyboard: false, interactive: !still,
        }).addTo(map);
        if (!still) rm.bindPopup(popupHtml(p, item.role));
        if (!opts.ignoreRegionsInFit) pts.push(ll);
        continue;
      }
      const cert = p.certainty || "known";
      const m = L.circleMarker(ll, {
        radius: item.primary ? 8 : 6,
        color: lapis, weight: 2,
        fillColor: cert === "known" ? lapis : "#ffffff",
        fillOpacity: cert === "uncertain" ? 0.35 : 0.95,
        dashArray: cert === "uncertain" ? "3 3" : null,
        className: "pin cert-" + cert,
      }).addTo(map);
      m.bindTooltip(esc(p.name), { permanent: opts.labels !== false, direction: "right", offset: [8, 0], className: "pin-label" });
      if (!still) m.bindPopup(popupHtml(p, item.role));
      pts.push(ll);
    }

    for (const j of opts.journeys || []) {
      const path = j.path.map(id => BIBLE.places[id]).filter(Boolean).map(p => [p.lat, p.lng]);
      if (path.length < 2) continue;
      const line = L.polyline(path, { color: ink, weight: 2.5, opacity: 0.9, dashArray: "6 6", className: "journey" }).addTo(map);
      line.bindTooltip(esc(j.label), { sticky: true, className: "pin-label" });
      // direction arrows at segment midpoints
      for (let i = 0; i < path.length - 1; i++) {
        const a = map.options.crs.latLngToPoint(L.latLng(path[i]), 6);
        const b = map.options.crs.latLngToPoint(L.latLng(path[i + 1]), 6);
        const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        const mid = [(path[i][0] + path[i + 1][0]) / 2, (path[i][1] + path[i + 1][1]) / 2];
        L.marker(mid, {
          interactive: false, keyboard: false,
          icon: L.divIcon({ className: "arrow", html: '<span style="transform:rotate(' + ang + 'deg)">&#10148;</span>', iconSize: [14, 14] }),
        }).addTo(map);
      }
      path.forEach(ll => pts.push(ll));
    }

    // Hide labels that would overlap an earlier (more important) label; they still show on hover.
    function declutter() {
      const placed = [];
      const labels = [];
      map.eachLayer(l => {
        const t = l.getTooltip && l.getTooltip();
        if (t && t.options.permanent && t.getElement()) labels.push(t.getElement());
      });
      el.querySelectorAll(".region-label span").forEach(s => labels.unshift(s));
      for (const node of labels) {
        node.style.visibility = "";
        const r = node.getBoundingClientRect();
        const hit = placed.some(p => !(r.right < p.left || r.left > p.right || r.bottom < p.top || r.top > p.bottom));
        if (hit) node.style.visibility = "hidden"; else placed.push(r);
      }
    }
    map.on("zoomend moveend", () => requestAnimationFrame(declutter));
    map.on("tooltipopen", () => {});
    map.eachLayer(l => {
      if (l.getTooltip && l.getTooltip() && l.getTooltip().options.permanent) {
        l.on("mouseover", () => { const e = l.getTooltip().getElement(); if (e) e.style.visibility = ""; });
        l.on("mouseout", () => requestAnimationFrame(declutter));
      }
    });

    if (pts.length === 1) map.setView(pts[0], opts.zoom || 6);
    else if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: opts.maxFitZoom || 8 });
    else map.setView([31.5, 38], 4);
    setTimeout(() => map.invalidateSize(), 50);
    return map;
  }

  function destroy(m) {
    const i = live.indexOf(m);
    if (i >= 0) live.splice(i, 1);
    try { m && m.remove(); } catch (e) {}
  }

  BIBLE.map = { render, destroy, destroyAll };
})();
