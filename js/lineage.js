/* Family trees built from the shared people registry (BIBLE.people). */
(function () {
  let childIndex = null;

  function buildIndex() {
    childIndex = {};
    for (const p of Object.values(BIBLE.people)) {
      const parent = p.father || p.mother;
      if (!parent) continue;
      (childIndex[parent] = childIndex[parent] || []).push(p.id);
    }
    // keep registry order but put line-of-promise children first
    for (const k in childIndex) {
      childIndex[k].sort((a, b) => (BIBLE.people[a].order || 0) - (BIBLE.people[b].order || 0));
    }
  }

  function children(id) {
    if (!childIndex) buildIndex();
    return childIndex[id] || [];
  }

  function ancestors(id) {
    const out = [];
    let p = BIBLE.people[id];
    while (p && (p.father || p.mother)) {
      const up = p.father || p.mother;
      out.push(up);
      p = BIBLE.people[up];
    }
    return out;
  }

  /* opts: { root, include?:[ids], highlight?:[ids], depth? } -> hierarchy data */
  function build(opts) {
    let keep = null;
    if (opts.include && opts.include.length) {
      keep = new Set();
      for (const id of opts.include) {
        keep.add(id);
        for (const a of ancestors(id)) { keep.add(a); if (a === opts.root) break; }
      }
    }
    const maxDepth = opts.depth == null ? 99 : opts.depth;
    function node(id, d) {
      const kids = d >= maxDepth ? [] : children(id).filter(c => !keep || keep.has(c));
      return { id, children: kids.map(c => node(c, d + 1)) };
    }
    return node(opts.root, 0);
  }

  function subtitle(p) {
    const bits = [];
    if (p.spouses && p.spouses.length) {
      bits.push("m. " + p.spouses.map(s => (BIBLE.people[s] || { name: s }).name).join(", "));
    }
    if (p.age) bits.push(p.age + " yrs");
    return bits.join("; ");
  }

  function render(el, opts) {
    if (!window.d3) { el.innerHTML = '<p class="empty">The family tree needs an internet connection to load.</p>'; return; }
    if (!BIBLE.people[opts.root]) { el.innerHTML = '<p class="empty">No family data for this chapter.</p>'; return; }
    childIndex = null;
    const data = build(opts);
    const hl = new Set(opts.highlight || opts.include || []);
    const root = d3.hierarchy(data);
    const rowH = 38, colW = opts.colWidth || 168;
    d3.tree().nodeSize([rowH, colW]).separation((a, b) => (a.parent === b.parent ? 1 : 1.25))(root);

    let x0 = Infinity, x1 = -Infinity, yMax = 0;
    root.each(d => { x0 = Math.min(x0, d.x); x1 = Math.max(x1, d.x); yMax = Math.max(yMax, d.y); });
    const padL = 16, padR = 170, padV = 26;
    const width = yMax + padL + padR;
    const height = x1 - x0 + padV * 2;

    el.innerHTML = "";
    const svg = d3.select(el).append("svg")
      .attr("class", "tree")
      .attr("width", width).attr("height", height)
      .attr("viewBox", [-padL, x0 - padV, width, height])
      .attr("role", "img")
      .attr("aria-label", "Family tree from " + BIBLE.people[opts.root].name);

    const promise = d => BIBLE.people[d.data.id] && BIBLE.people[d.data.id].promise;
    svg.append("g").attr("class", "links")
      .selectAll("path").data(root.links()).join("path")
      .attr("class", l => "link" + (promise(l.source) && promise(l.target) ? " promise" : ""))
      .attr("d", l => {
        const mx = (l.source.y + l.target.y) / 2;
        return "M" + l.source.y + "," + l.source.x + "H" + mx + "V" + l.target.x + "H" + l.target.y;
      });

    const g = svg.append("g").attr("class", "nodes")
      .selectAll("a").data(root.descendants()).join("a")
      .attr("href", d => "#/people/" + d.data.id)
      .attr("class", d => "node" + (hl.has(d.data.id) ? " hl" : "") + (promise(d) ? " promise" : "") +
        ((BIBLE.people[d.data.id] || {}).sex === "f" ? " female" : ""))
      .attr("transform", d => "translate(" + d.y + "," + d.x + ")");

    g.append("circle").attr("r", d => (hl.has(d.data.id) ? 6 : 4.5));
    g.append("text").attr("class", "nm").attr("x", 10).attr("dy", d => (subtitle(BIBLE.people[d.data.id] || {}) ? "-0.15em" : "0.32em"))
      .text(d => (BIBLE.people[d.data.id] || { name: d.data.id }).name);
    g.append("text").attr("class", "sub").attr("x", 10).attr("dy", "1.05em")
      .text(d => subtitle(BIBLE.people[d.data.id] || {}));
    if (opts.fit) {   // scale the whole tree into its container (tile previews)
      svg.attr("width", "100%").attr("height", "100%").attr("preserveAspectRatio", "xMidYMid meet");
    }
    g.append("title").text(d => {
      const p = BIBLE.people[d.data.id] || {};
      return p.name + (p.meaning ? " (" + p.meaning + ")" : "") + (p.bio ? "\n" + p.bio : "");
    });
  }

  /* How many people a tree would show (used to decide whether a preview should be pruned). */
  function size(opts) {
    childIndex = null;
    let n = 0;
    (function walk(node) { n++; node.children.forEach(walk); })(build(opts));
    return n;
  }

  BIBLE.lineage = { render, size, children, ancestors, rebuild: () => { childIndex = null; } };
})();
