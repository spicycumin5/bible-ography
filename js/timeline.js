/* Timelines: a whole-Bible era strip, and lifespan charts for the chapter's people. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const fmtBC = y => (y < 0 ? Math.abs(y) + " BC" : "AD " + y);
  const fmtAM = y => "AM " + y;

  let tip;
  function tooltip(host) {
    if (!tip) { tip = document.createElement("div"); tip.className = "viz-tip"; tip.hidden = true; document.body.appendChild(tip); }
    return {
      show(evt, html) { tip.innerHTML = html; tip.hidden = false; this.move(evt); },
      move(evt) {
        const r = tip.getBoundingClientRect();
        let x = evt.clientX + 14, y = evt.clientY + 14;
        if (x + r.width > innerWidth - 8) x = evt.clientX - r.width - 14;
        if (y + r.height > innerHeight - 8) y = evt.clientY - r.height - 14;
        tip.style.left = x + "px"; tip.style.top = y + "px";
      },
      hide() { tip.hidden = true; },
    };
  }

  /* Era strip across all of biblical history; marks where `eraId`/`year` falls. */
  function eraStrip(host, { eraId, year, label }) {
    host.innerHTML = "";
    const W = Math.max(host.clientWidth || 640, 320), H = 74;
    const svg = el("svg", { class: "era-strip", viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img",
      "aria-label": "Where this chapter falls in biblical history" }, host);
    const primW = Math.min(110, W * 0.18);
    const t0 = -2200, t1 = 100;
    const x = y => primW + 6 + ((y - t0) / (t1 - t0)) * (W - primW - 6);
    const tt = tooltip(host);
    BIBLE.eras.forEach((e, i) => {
      const x0 = e.start == null ? 0 : x(e.start);
      const x1 = e.start == null ? primW : x(e.end);
      const g = el("g", { class: "era" + (e.id === eraId ? " current" : "") + (i % 2 ? " alt" : "") }, svg);
      el("rect", { x: x0 + 1, y: 18, width: Math.max(1, x1 - x0 - 2), height: 26, rx: 3 }, g);
      if (x1 - x0 > 64 || e.start == null) {
        const t = el("text", { x: (x0 + x1) / 2, y: 35, "text-anchor": "middle" }, g);
        t.textContent = e.start == null ? "Primeval" : e.name;
      }
      g.addEventListener("mouseenter", ev => tt.show(ev, "<strong>" + e.name + "</strong><br>" +
        (e.start == null ? "Undated" : fmtBC(e.start) + " to " + fmtBC(e.end)) + (e.note ? "<p>" + e.note + "</p>" : "")));
      g.addEventListener("mousemove", ev => tt.move(ev));
      g.addEventListener("mouseleave", () => tt.hide());
    });
    // axis ticks
    for (const y of [-2000, -1500, -1000, -500, 0]) {
      const t = el("text", { x: x(y), y: 60, class: "tick", "text-anchor": "middle" }, svg);
      t.textContent = y === 0 ? "BC | AD" : fmtBC(y);
    }
    // marker
    let mx = null;
    if (typeof year === "number") mx = x(year);
    else if (eraId === "primeval") mx = primW / 2;
    if (mx != null) {
      el("line", { x1: mx, x2: mx, y1: 8, y2: 48, class: "marker" }, svg);
      el("path", { d: "M" + (mx - 5) + ",4 L" + (mx + 5) + ",4 L" + mx + ",11 Z", class: "marker-head" }, svg);
      if (label) {
        const anchor = mx < 40 ? "start" : mx > W - 40 ? "end" : "middle";
        const t = el("text", { x: mx, y: 70, "text-anchor": anchor, class: "marker-label" }, svg);
        t.textContent = label;
      }
    }
  }

  /* Lifespans. opts: { scale:"am"|"bc", people:[ids], highlight:[ids], mark, markLabel, events:bool } */
  function lifespans(host, opts) {
    host.innerHTML = "";
    const am = opts.scale === "am";
    const rows = opts.people.map(id => BIBLE.people[id]).filter(p => p && (am ? p.bornAM != null : p.born != null));
    if (!rows.length) { host.hidden = true; return; }
    host.hidden = false;
    const span = p => am ? [p.bornAM, p.diedAM] : [p.born, p.died];
    let lo = Infinity, hi = -Infinity;
    rows.forEach(p => { const [a, b] = span(p); lo = Math.min(lo, a); hi = Math.max(hi, b == null ? a + 1 : b); });
    if (typeof opts.mark === "number") { lo = Math.min(lo, opts.mark); hi = Math.max(hi, opts.mark); }
    const pad = (hi - lo) * 0.04 + 5; lo -= pad; hi += pad;
    const events = !am && opts.events !== false
      ? BIBLE.worldEvents.filter(e => e.end > lo && e.start < hi) : [];

    const W = Math.max(host.clientWidth || 640, 320), gutter = Math.min(124, W * 0.3), rowH = 22, top = 26;
    const H = top + rows.length * rowH + (events.length ? 22 + events.length * 16 : 0) + 26;
    const svg = el("svg", { class: "lifespans", viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img",
      "aria-label": "Lifespans of people in this chapter" }, host);
    const x = v => gutter + ((v - lo) / (hi - lo)) * (W - gutter - 12);
    const tt = tooltip(host);
    const fmt = am ? fmtAM : fmtBC;

    // grid + ticks
    const stepCands = [10, 25, 50, 100, 200, 250, 500];
    const step = stepCands.find(s => (hi - lo) / s <= 7) || 500;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      el("line", { x1: x(v), x2: x(v), y1: top - 6, y2: H - 22, class: "grid" }, svg);
      const t = el("text", { x: x(v), y: H - 8, class: "tick", "text-anchor": "middle" }, svg);
      t.textContent = am ? v : fmtBC(v);
    }
    if (am) { const t = el("text", { x: gutter, y: 12, class: "tick" }, svg); t.textContent = "Years after creation (Anno Mundi), from the Hebrew genealogies"; }

    const hl = new Set(opts.highlight || opts.people);
    rows.forEach((p, i) => {
      const [a, b0] = span(p); const b = b0 == null ? a + 1 : b0;
      const y = top + i * rowH;
      const g = el("a", { href: "#/people/" + p.id, class: "life" + (hl.has(p.id) ? " hl" : "") + (b0 == null ? " open" : "") }, svg);
      const lbl = el("text", { x: gutter - 8, y: y + 11, "text-anchor": "end", class: "life-name" }, g);
      lbl.textContent = p.name;
      el("rect", { x: x(a), y: y + 2, width: Math.max(3, x(b) - x(a)), height: 12, rx: 4 }, g);
      el("rect", { x: 0, y: y, width: W, height: rowH, class: "hit" }, g);
      const age = b0 != null ? b0 - a : null;
      g.addEventListener("mouseenter", ev => tt.show(ev, "<strong>" + p.name + "</strong><br>" + fmt(a) +
        (b0 != null ? " to " + fmt(b0) + "<br>" + age + " years" : "<br>death not recorded")));
      g.addEventListener("mousemove", ev => tt.move(ev));
      g.addEventListener("mouseleave", () => tt.hide());
    });

    if (events.length) {
      let y = top + rows.length * rowH + 14;
      const h = el("text", { x: gutter - 8, y: y + 2, "text-anchor": "end", class: "tick" }, svg);
      h.textContent = "Wider world";
      y += 8;
      events.forEach(e => {
        const g = el("g", { class: "world" }, svg);
        const xa = x(Math.max(e.start, lo)), xb = x(Math.min(e.end, hi));
        el("rect", { x: xa, y, width: Math.max(2, xb - xa), height: 8, rx: 3 }, g);
        const t = el("text", { x: xa + 4, y: y + 7, class: "world-name" }, g);
        t.textContent = e.name;
        el("rect", { x: xa, y: y - 4, width: Math.max(8, xb - xa), height: 16, class: "hit" }, g);
        g.addEventListener("mouseenter", ev => tt.show(ev, "<strong>" + e.name + "</strong><br>" + fmtBC(e.start) + " to " + fmtBC(e.end)));
        g.addEventListener("mousemove", ev => tt.move(ev));
        g.addEventListener("mouseleave", () => tt.hide());
        y += 16;
      });
    }

    if (typeof opts.mark === "number") {
      const mx = x(opts.mark);
      el("line", { x1: mx, x2: mx, y1: top - 8, y2: H - 22, class: "marker" }, svg);
      const t = el("text", { x: Math.min(mx + 4, W - 4), y: top - 12, class: "marker-label", "text-anchor": mx > W - 120 ? "end" : "start" }, svg);
      t.textContent = opts.markLabel || fmt(opts.mark);
    }
  }

  BIBLE.timeline = { eraStrip, lifespans, fmtBC, fmtAM };
})();
