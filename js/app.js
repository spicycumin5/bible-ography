/* Bible-ography app: routing, data loading and views. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const R = BIBLE.refs;
  const esc = R.esc;
  const view = () => $("#view");

  const GOSPEL_TYPES = {
    promise: "Promise",
    type: "Foreshadowing",
    fulfillment: "Fulfilled in Christ",
    theme: "Gospel theme",
  };

  /* ---------- loading ---------- */
  const loaded = {};
  function loadScript(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise(resolve => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
      });
    }
    return loaded[src];
  }

  const bookLoads = {};
  function loadBook(id) {
    const b = BIBLE.getBook(id);
    if (!b || !b.ready) return Promise.resolve(false);
    if (!bookLoads[id]) {
      bookLoads[id] = loadScript("data/" + id + "/book.js").then(() =>
        Promise.all(Array.from({ length: b.chapters }, (_, i) => loadScript("data/" + id + "/" + String(i + 1).padStart(2, "0") + ".js")))
      ).then(() => Promise.all([loadScript("data/" + id + "/study.js"), loadScript("data/" + id + "/glance.js")])).then(() => { buildAppearances(); return true; });
    }
    return bookLoads[id];
  }
  const loadAllReady = () => Promise.all(BIBLE.books.filter(b => b.ready).map(b => loadBook(b.id)));

  /* who/where appears in which chapter */
  let appears = { people: {}, places: {}, words: {}, threads: {} };
  function buildAppearances() {
    appears = { people: {}, places: {}, words: {}, threads: {} };
    const keys = Object.keys(BIBLE.chapters).sort(chapterSort);
    const add = (map, id, k) => { const l = (map[id] = map[id] || []); if (!l.includes(k)) l.push(k); };
    for (const k of keys) {
      const c = BIBLE.chapters[k];
      for (const p of c.people || []) add(appears.people, p.id, k);
      for (const p of c.places || []) add(appears.places, p.id, k);
      const st = BIBLE.studies[k] || {};
      for (const w of st.words || []) add(appears.words, w.id, k);
      for (const t of st.threads || []) add(appears.threads, t.id, k);
    }
    BIBLE.appears = appears;
    BIBLE.lineage.rebuild();
  }
  function chapterSort(a, b) {
    const [ba, na] = a.split("/"), [bb, nb] = b.split("/");
    const ia = BIBLE.books.findIndex(x => x.id === ba), ib = BIBLE.books.findIndex(x => x.id === bb);
    return ia - ib || na - nb;
  }
  function chapterLabel(key, withTitle) {
    const [b, n] = key.split("/");
    const book = BIBLE.getBook(b);
    const c = BIBLE.chapters[key];
    return (withTitle ? "" : book.abbr[0] + " ") + n + (withTitle && c ? " " + c.title : "");
  }

  /* ---------- helpers ---------- */
  const paras = t => String(t || "").split(/\n\s*\n/).map(p => "<p>" + R.linkify(p.trim()) + "</p>").join("");
  const person = id => BIBLE.people[id];
  const pname = id => (person(id) || { name: id }).name;
  const plink = id => person(id) ? '<a href="#/people/' + id + '">' + esc(pname(id)) + "</a>" : esc(id);

  function family(id) {
    const p = person(id);
    if (!p) return {};
    const all = Object.values(BIBLE.people);
    const spouses = new Set(p.spouses || []);
    all.forEach(o => { if ((o.spouses || []).includes(id)) spouses.add(o.id); });
    const kids = all.filter(o => o.father === id || o.mother === id).map(o => o.id);
    const siblings = (p.father || p.mother)
      ? all.filter(o => o.id !== id && ((p.father && o.father === p.father) || (p.mother && o.mother === p.mother))).map(o => o.id)
      : [];
    return { father: p.father, mother: p.mother, spouses: [...spouses], children: kids, siblings };
  }

  function familyLine(id) {
    const f = family(id);
    const p = person(id);
    const parts = [];
    const childWord = p.sex === "f" ? "Daughter" : "Son";
    const parents = [f.father, f.mother].filter(Boolean);
    if (parents.length) parts.push(childWord + " of " + parents.map(plink).join(" and "));
    if (f.spouses.length) parts.push((p.sex === "f" ? "wife of " : "husband of ") + f.spouses.map(plink).join(", "));
    if (f.children.length) {
      const shown = f.children.slice(0, 6).map(plink).join(", ");
      parts.push("parent of " + shown + (f.children.length > 6 ? " and " + (f.children.length - 6) + " more" : ""));
    }
    if (!parts.length) return "";
    const s = parts.join("; ");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function chapterChips(keys, current) {
    return (keys || []).map(k => k === current
      ? '<span class="chip here">' + esc(chapterLabel(k)) + "</span>"
      : '<a class="chip" href="#/' + k + '">' + esc(chapterLabel(k)) + "</a>").join("");
  }

  function setTitle(t) { document.title = t ? t + " | Bible-ography" : "Bible-ography"; }

  /* ---------- views ---------- */
  function home() {
    setTitle("");
    const groups = { OT: {}, NT: {} };
    BIBLE.books.forEach(b => { (groups[b.testament][b.genre] = groups[b.testament][b.genre] || []).push(b); });
    const col = (t, title) => '<section class="testament"><h2>' + title + "</h2>" +
      Object.entries(groups[t]).map(([g, books]) => '<div class="genre"><h3>' + esc(g) + '</h3><ul class="shelf">' +
        books.map(b => '<li><a class="spine' + (b.ready ? " ready" : "") + '" href="#/' + b.id + '"><span class="bk">' + esc(b.name) +
          '</span><span class="ct">' + b.chapters + (b.chapters === 1 ? " chapter" : " chapters") + "</span></a></li>").join("") +
        "</ul></div>").join("") + "</section>";
    view().innerHTML =
      '<header class="home-hero">' +
        '<p class="home-mark" aria-hidden="true">B</p>' +
        '<div><h1>Bible-ography</h1>' +
        '<p class="lede">A companion to keep open beside your Bible. Each chapter has its setting on a map, the families involved, where it falls in history, who the people are, and how it points to Jesus.</p>' +
        '<p class="home-start"><a class="btn" href="#/genesis">Start with Genesis</a> <a class="btn ghost" href="#/genesis/1">Go to Genesis 1</a></p></div>' +
      "</header>" +
      '<div class="library">' + col("OT", "Old Testament") + col("NT", "New Testament") + "</div>" +
      '<p class="legend-note"><span class="dot ready"></span>Books with a gold edge have chapter guides written. The rest are listed so you can see the whole library; guides for them can be added the same way.</p>';
  }

  function notReady(book) {
    setTitle(book.name);
    view().innerHTML = '<div class="narrow"><h1 class="book-title">' + esc(book.name) + "</h1>" +
      '<p class="lede">' + book.chapters + " chapters, " + esc(book.genre) + ".</p>" +
      "<p>Chapter guides for " + esc(book.name) + " haven't been written yet. Genesis is complete, so you can see what each guide includes there.</p>" +
      '<p><a class="btn" href="#/genesis">Open Genesis</a> ' + R.link(book.abbr[0] + " 1") + "</p></div>";
  }

  /* ---------- shared glance helpers ---------- */
  const mapKey = () => '<p class="map-key"><span class="mk known"></span>Location known <span class="mk probable"></span>Probable <span class="mk uncertain"></span>Uncertain or disputed <span class="mk route"></span>Journey</p>';
  const treeKey = (noHl) => '<p class="map-key">' + (noHl ? "" : '<span class="tk hl"></span>In this chapter ') + '<span class="tk promise"></span>Line of promise leading to Christ <span class="tk plain"></span>Other family</p>';
  const firstGloss = g => String(g).split(/[,;]/)[0];
  const initials = name => name.replace(/^(the|Lot's|Noah's|Potiphar's|Shua's)\s+/i, "").split(/[\s-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  // "Undated. Ussher's calculation…" -> "Undated"; "c. 2091 BC (Abram 75)" -> "c. 2091 BC"
  const shortDate = d => (d.traditional || "").replace(/\s*\(.*?\)\s*/g, " ").split(/;|,|\.\s+(?=[A-Z])/)[0].trim();

  /* Distribute 4 grid columns across a row of tiles: [{weight}] -> spans */
  function spans(tiles, cols) {
    if (!tiles.length) return [];
    const w = tiles.map(t => t.weight || 1);
    const sum = w.reduce((a, b) => a + b, 0);
    let out = w.map(x => Math.max(1, Math.floor((x / sum) * cols)));
    let used = out.reduce((a, b) => a + b, 0), i = 0;
    while (used < cols) { out[i % out.length]++; used++; i++; }
    while (used > cols) { const j = out.indexOf(Math.max(...out)); out[j]--; used--; }
    return out;
  }

  function tileRow(tiles, cols) {
    const sp = spans(tiles, cols);
    return tiles.map((t, i) => '<button type="button" class="tile tile-' + t.id + '" data-open="' + t.open + '" style="--span:' + sp[i] + '">' +
      '<span class="t-label">' + esc(t.label) + "</span>" + t.html + "</button>").join("");
  }

  function wireTiles(root) {
    root.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", e => {
      if (e.target.closest("a")) return;
      BIBLE.drawer.open(b.dataset.open);
    }));
  }

  /* Pixels of the map hidden under the stage's side columns, title and horizon, so pins are framed in the clear middle. */
  function stagePadding() {
    if (innerWidth < 900) return { tl: [20, 20], br: [20, 20] };
    const side = Math.min(380, innerWidth * 0.26);
    return { tl: [side, 150], br: [side, 130] };
  }

  /* Place the left column just below the title, whatever height the title wraps to. */
  function layoutStage() {
    const st = document.querySelector(".stage"), t = st && st.querySelector(".st-title"), l = st && st.querySelector(".st-left");
    if (!t || !l) return;
    if (innerWidth < 900 || innerHeight < 600) { l.style.top = ""; return; }
    l.style.top = (t.offsetTop + t.offsetHeight + 18) + "px";
  }
  window.addEventListener("resize", () => { clearTimeout(layoutStage.t); layoutStage.t = setTimeout(layoutStage, 120); });

  function setHeadHeight() {
    const h = document.querySelector(".site-head");
    if (h) document.documentElement.style.setProperty("--head", h.offsetHeight + "px");
  }

  /* ---------- book overview ---------- */
  function bookView(book, sectionId) {
    const info = BIBLE.bookInfo[book.id] || {};
    setTitle(book.name);
    const sections = info.sections || [];
    const sectionOf = n => sections.find(s => n >= s.from && n <= s.to);
    const grid = Array.from({ length: book.chapters }, (_, i) => {
      const n = i + 1, c = BIBLE.chapters[book.id + "/" + n], s = sectionOf(n);
      return '<li><a class="ch-tile s' + (s ? sections.indexOf(s) % 4 : 0) + '" href="#/' + book.id + "/" + n + '" title="' + esc(BIBLE.taglinesMap[book.id + "/" + n] || "") + '">' +
        '<span class="n">' + n + '</span><span class="t">' + esc(c ? c.title : "Not written yet") + "</span></a></li>";
    }).join("");
    const allPlaces = {};
    Object.values(BIBLE.chapters).filter(c => c.book === book.id).forEach(c => (c.places || []).forEach(p => { allPlaces[p.id] = { id: p.id }; }));

    /* drawer sections */
    const secs = [];
    secs.push({ id: "overview", title: "About " + book.name, tab: "Overview",
      html: '<div class="prose">' + paras(info.intro) + "</div>" +
        (info.facts ? '<dl class="facts">' + info.facts.map(f => "<div><dt>" + esc(f[0]) + "</dt><dd>" + R.linkify(f[1]) + "</dd></div>").join("") + "</dl>" : "") });
    if (sections.length) secs.push({ id: "structure", title: info.structureTitle || "How the book is built", tab: "Structure",
      html: '<ol class="structure">' + sections.map((s, i) => '<li class="s' + (i % 4) + '"><a href="#/' + book.id + "/" + s.from + '"><span class="rng">' +
          (s.from === s.to ? s.from : s.from + "–" + s.to) + '</span><span class="st">' + esc(s.title) + "</span></a>" +
          (s.note ? "<p>" + R.linkify(s.note) + "</p>" : "") + "</li>").join("") + "</ol>" +
        (info.toledot ? '<h3 class="minor">' + esc(info.toledot.title) + '</h3><div class="prose">' + paras(info.toledot.note) + "</div>" +
          '<ol class="toledot">' + info.toledot.items.map(t => '<li><span class="tt">' + esc(t.title) + "</span> " + R.link(t.ref, book.id) +
            (t.note ? "<p>" + R.linkify(t.note) + "</p>" : "") + "</li>").join("") + "</ol>" : "") });
    if (info.gospel) secs.push({ id: "gospel", title: "The gospel thread", tab: "Gospel thread",
      html: (info.gospelIntro ? '<div class="prose">' + paras(info.gospelIntro) + "</div>" : "") +
        '<ol class="thread">' + info.gospel.map(g => "<li><h3>" + esc(g.title) + "</h3>" + paras(g.body) +
          '<p class="refs">' + (g.refs || []).map(r => R.link(r, book.id)).join("") + "</p></li>").join("") + "</ol>" });
    secs.push({ id: "places", title: "Every place in " + book.name, tab: "Places",
      html: '<div class="map tall dr-map"></div>' + mapKey(),
      after: b => [BIBLE.map.render(b.querySelector(".dr-map"), { places: Object.values(allPlaces), maxFitZoom: 5, ignoreRegionsInFit: true })] });
    if (info.lineage) secs.push({ id: "family", title: info.lineage.title || "Family tree", tab: "Family tree",
      html: (info.lineage.note ? '<p class="note">' + R.linkify(info.lineage.note) + "</p>" : "") + '<div class="tree-wrap dr-tree"></div>' + treeKey(true) +
        '<p class="hint">Scroll sideways inside the tree to follow the line all the way to Jacob’s sons.</p>',
      after: b => { BIBLE.lineage.render(b.querySelector(".dr-tree"), info.lineage); } });
    if (info.timeline) secs.push({ id: "lifespans", title: "Lifespans", tab: "Lifespans",
      html: info.timeline.map((t, i) => '<h3 class="minor">' + esc(t.title) + "</h3>" + (t.note ? '<p class="note">' + R.linkify(t.note) + "</p>" : "") +
        '<div class="tl dr-tl-' + i + '"></div>').join(""),
      after: b => { info.timeline.forEach((t, i) => BIBLE.timeline.lifespans(b.querySelector(".dr-tl-" + i), t)); } });

    /* ----- the stage: every place in the book is the backdrop ----- */
    const chain = ["adam", "noah", "abraham", "isaac", "jacob"].filter(id => person(id));
    const ribbon = Array.from({ length: book.chapters }, (_, i) => {
      const n = i + 1, k = book.id + "/" + n, c = BIBLE.chapters[k], s = sectionOf(n);
      return '<li class="s' + (s ? sections.indexOf(s) % 4 : 0) + '"><a href="#/' + k + '" data-n="' + n + '" data-t="' + esc(c ? c.title : "") + '" data-g="' + esc(BIBLE.taglinesMap[k] || "") + '">' +
        "<span>" + n + "</span></a></li>";
    }).join("");

    view().innerHTML = '<div class="stage book-stage">' +
      '<div class="st-map" id="st-map"></div><div class="st-fade" aria-hidden="true"></div>' +
      '<header class="st-title">' +
        '<p class="ch-book">' + (book.testament === "OT" ? "Old Testament" : "New Testament") + ", " + esc(book.genre) + "</p>" +
        '<h1 class="book-title">' + esc(book.name) + "</h1>" + (info.subtitle ? '<p class="g-tag">' + esc(info.subtitle) + "</p>" : "") +
        '<p class="st-actions"><button type="button" class="pill-btn primary" data-open="overview">About the book</button>' +
          '<button type="button" class="pill-btn" data-open="places">' + Object.keys(allPlaces).length + " places</button>" +
          (info.timeline ? '<button type="button" class="pill-btn" data-open="lifespans">Lifespans</button>' : "") + "</p>" +
      "</header>" +
      '<aside class="st-left">' +
        (sections.length ? '<button type="button" class="st-block" data-open="structure"><span class="st-label">Four movements</span>' +
          '<ol class="st-moves">' + sections.map((s, i) => '<li class="s' + (i % 4) + '"><span class="mv">' + esc(s.short || s.title) + "</span><em>" + s.from + "–" + s.to + "</em></li>").join("") + "</ol></button>" : "") +
        (info.lineage ? '<button type="button" class="st-block" data-open="family"><span class="st-label">The family line</span>' +
          '<ol class="t-chain">' + chain.map(id => "<li>" + esc(pname(id)) + "</li>").join("") + "<li>12 tribes</li></ol></button>" : "") +
      "</aside>" +
      (info.gospel ? '<aside class="st-right"><button type="button" class="st-block" data-open="gospel"><span class="st-label">The gospel thread</span>' +
        '<ul class="t-list">' + info.gospel.map(g => '<li><span class="dia"></span>' + esc(g.title) + "</li>").join("") + "</ul></button></aside>" : "") +
      '<footer class="st-horizon st-ribbon-wrap">' +
        '<p class="st-hover" id="st-hover"><span class="hv-n">Choose a chapter</span><span class="hv-t"></span></p>' +
        '<ol class="st-ribbon">' + ribbon + "</ol>" +
      "</footer>" +
    "</div>";

    setHeadHeight();
    layoutStage();
    wireTiles(view());
    const hv = $("#st-hover");
    view().querySelectorAll(".st-ribbon a").forEach(a => {
      const show = () => { hv.querySelector(".hv-n").textContent = book.name + " " + a.dataset.n + ": " + a.dataset.t; hv.querySelector(".hv-t").textContent = a.dataset.g; };
      a.addEventListener("mouseenter", show); a.addEventListener("focus", show);
    });
    BIBLE.map.render($("#st-map"), { places: Object.values(allPlaces), stage: true, labels: false, maxFitZoom: 5, ignoreRegionsInFit: true, padding: stagePadding() });

    BIBLE.drawer.setup(secs, { base: "#/" + book.id, label: book.name });
    if (sectionId) BIBLE.drawer.open(sectionId, { silent: true });
  }

  /* ---------- chapter: at-a-glance page + drawer ---------- */
  function chapterView(book, n, sectionId) {
    const key = book.id + "/" + n;
    const c = BIBLE.chapters[key];
    const info = BIBLE.bookInfo[book.id] || {};
    const sec = (info.sections || []).find(s => n >= s.from && n <= s.to);
    const prev = n > 1 ? n - 1 : null, next = n < book.chapters ? n + 1 : null;
    setTitle(book.name + " " + n + (c ? ": " + c.title : ""));

    const keep = sectionId ? "/" + sectionId : "";
    const options = Array.from({ length: book.chapters }, (_, i) => {
      const k = book.id + "/" + (i + 1), cc = BIBLE.chapters[k];
      return '<option value="' + (i + 1) + '"' + (i + 1 === n ? " selected" : "") + ">" + (i + 1) + (cc ? ": " + esc(cc.title) : "") + "</option>";
    }).join("");
    const nav = '<nav class="ch-nav" aria-label="Chapters">' +
      (prev ? '<a class="pn" data-pn="' + prev + '" href="#/' + book.id + "/" + prev + '" title="Previous chapter (left arrow key)"><span class="pn-book">' + esc(book.name) + " </span>" + prev + "</a>" : '<span class="pn off"></span>') +
      '<label class="ch-pick"><span class="sr">Jump to chapter</span><select id="ch-select">' + options + "</select></label>" +
      (next ? '<a class="pn nx" data-pn="' + next + '" href="#/' + book.id + "/" + next + '" title="Next chapter (right arrow key)"><span class="pn-book">' + esc(book.name) + " </span>" + next + "</a>" : '<span class="pn off"></span>') +
      "</nav>";

    if (!c) {
      view().innerHTML = nav + '<div class="narrow"><h1>' + esc(book.name) + " " + n + "</h1><p>This chapter guide hasn't been written yet.</p><p>" + R.link(book.abbr[0] + " " + n) + "</p></div>";
      wireNav(book);
      BIBLE.drawer.setup([], { base: "#/" + key, label: "" });
      return;
    }

    const study = BIBLE.studies[key] || {};
    const era = BIBLE.eras.find(e => e.id === c.era) || {};
    const d = c.date || {};
    const tl = c.timeline || {};
    const am = (tl.scale || (c.era === "primeval" ? "am" : "bc")) === "am";
    const lifeOpts = {
      scale: am ? "am" : "bc",
      people: tl.people || (c.people || []).map(p => p.id),
      highlight: (c.people || []).map(p => p.id),
      mark: am ? d.am : d.year,
      markLabel: tl.markLabel || (book.abbr[0] + " " + n),
      events: tl.events,
    };

    /* ----- drawer sections (the full detail) ----- */
    const secs = [];
    const S = (id, tab, title, html, after) => secs.push({ id, tab, title, html, after });
    S("story", "Story", "The story", '<div class="summary' + (/^['"‘“]/.test(c.summary) ? " quoted" : "") + '">' + paras(c.summary) + "</div>" +
      (c.outline ? '<h3 class="minor">Outline</h3><ol class="dr-outline">' + c.outline.map(o => "<li>" + R.link(o.ref, book.id) + "<span>" + R.linkify(o.text) + "</span></li>").join("") + "</ol>" : "") +
      '<p class="read-it">' + R.link(book.abbr[0] + " " + n) + ' <span class="hint">Opens the chapter in the ' + R.version + " on BibleGateway</span></p>");
    if ((c.places || []).length) S("setting", "Setting", "Setting",
      (c.setting ? '<p class="note">' + R.linkify(c.setting) + "</p>" : "") + '<div class="map dr-map"></div>' + mapKey() +
      ((c.journeys || []).length ? '<ul class="journeys">' + c.journeys.map(j => "<li><strong>" + esc(j.label) + "</strong> " +
        j.path.map(id => esc((BIBLE.places[id] || { name: id }).name)).join(" → ") + (j.ref ? " " + R.link(j.ref, book.id) : "") + "</li>").join("") + "</ul>" : "") +
      '<ul class="place-list">' + c.places.filter(p => BIBLE.places[p.id]).map(p => {
        const pl = BIBLE.places[p.id];
        return '<li><a href="#/places/' + p.id + '">' + esc(pl.name) + "</a>" + (pl.modern ? '<span class="modern">' + esc(pl.modern) + "</span>" : "") +
          (p.role ? "<span>" + R.linkify(p.role) + "</span>" : "") + "</li>";
      }).join("") + "</ul>",
      b => [BIBLE.map.render(b.querySelector(".dr-map"), { places: c.places, journeys: c.journeys })]);
    if (c.lineage) S("family", "Family", c.lineage.title || "Family tree",
      (c.lineage.note ? '<p class="note">' + R.linkify(c.lineage.note) + "</p>" : "") + '<div class="tree-wrap dr-tree"></div>' + treeKey(),
      b => { BIBLE.lineage.render(b.querySelector(".dr-tree"), c.lineage); });
    S("when", "When", "When",
      '<div class="tl dr-era"></div><dl class="dates">' +
        "<div><dt>Era</dt><dd>" + esc(era.name || "") + "</dd></div>" +
        (d.traditional ? "<div><dt>Traditional dating</dt><dd>" + esc(d.traditional) + "</dd></div>" : "") +
        (d.scholarly ? "<div><dt>Other scholarly views</dt><dd>" + esc(d.scholarly) + "</dd></div>" : "") +
      "</dl>" + (d.note ? '<p class="note">' + R.linkify(d.note) + "</p>" : "") + '<div class="tl dr-life"></div>',
      b => { BIBLE.timeline.eraStrip(b.querySelector(".dr-era"), { eraId: c.era, year: d.year, label: book.abbr[0] + " " + n }); BIBLE.timeline.lifespans(b.querySelector(".dr-life"), lifeOpts); });
    if ((c.people || []).length) S("people", "People", "People", '<div class="pcards">' + c.people.map(item => {
      const p = person(item.id);
      if (!p) return "";
      return '<article class="pcard' + (p.promise ? " promise" : "") + '" id="pc-' + p.id + '"><header><h3><a href="#/people/' + p.id + '">' + esc(p.name) + "</a></h3>" +
        (p.meaning ? '<p class="meaning">' + esc(p.meaning) + "</p>" : "") + "</header>" +
        (item.note ? '<p class="role">' + R.linkify(item.note) + "</p>" : "") +
        (p.bio ? '<p class="bio">' + R.linkify(p.bio) + "</p>" : "") +
        (familyLine(p.id) ? '<p class="fam">' + familyLine(p.id) + "</p>" : "") +
        '<p class="seen"><span class="seen-l">Appears in</span>' + chapterChips(appears.people[p.id], key) + "</p></article>";
    }).join("") + "</div>");
    if ((study.threads || []).length) S("threads", "Threads", "Story threads",
      '<p class="note">Themes and plotlines that run through the whole Bible, and what each is doing in this chapter.</p>' +
      '<ol class="threads">' + study.threads.map(t => threadItem(t, key)).join("") + "</ol>");
    if ((study.words || []).length) S("words", "Words", "Words behind the English",
      '<p class="note">Hebrew words in this chapter that no single English word captures. <a href="#/words">See all word studies</a>.</p>' +
      '<div class="wcards">' + study.words.map(w => BIBLE.wordsUI.card(w, book.id)).join("") + "</div>");
    if ((c.gospel || []).length) S("christ", "Christ", "Pointing to Christ", '<ol class="gospel">' + c.gospel.map(g =>
      '<li class="g g-' + (g.type || "theme") + '"><p class="g-kind"><span class="g-mark"></span>' + esc(GOSPEL_TYPES[g.type] || "Gospel theme") + "</p>" +
        "<h3>" + esc(g.title || "") + "</h3>" + paras(g.body) +
        '<p class="g-refs">' + (g.ot ? '<span class="g-ot">' + R.link(g.ot, book.id) + "</span>" : "") +
        (g.nt || []).map(r => R.link(r)).join("") + "</p></li>").join("") + "</ol>");
    if ((c.context || []).length) S("background", "Background", "Background", c.context.map(x =>
      '<div class="ctx"><h3>' + esc(x.title) + "</h3>" + paras(x.body) + "</div>").join(""));
    S("reflect", "Reflect", "Reflect",
      ((c.themes || []).length ? '<p class="themes">' + c.themes.map(t => '<span class="theme">' + esc(t) + "</span>").join("") + "</p>" : "") +
      ((c.questions || []).length ? '<ol class="questions">' + c.questions.map(q => "<li>" + R.linkify(q) + "</li>").join("") + "</ol>" : "") +
      ((c.crossrefs || []).length ? '<p class="xrefs"><span class="seen-l">Read alongside</span>' + c.crossrefs.map(r => R.link(r, book.id)).join("") + "</p>" : ""));
    const has = id => secs.some(s => s.id === id);

    /* ----- the stage: the chapter's land is the backdrop, everything else rests on it ----- */
    const journey = (c.journeys || [])[0];
    const clean = name => name.replace(/\s*\(.*\)/, "");
    const placeNames = (c.places || []).map(p => BIBLE.places[p.id]).filter(p => p && p.type !== "region").map(p => clean(p.name));
    const settingCap = journey ? journey.path.map(id => clean((BIBLE.places[id] || { name: id }).name)).join(" → ")
      : placeNames.length ? placeNames.slice(0, 3).join(", ") + (placeNames.length > 3 ? " +" + (placeNames.length - 3) : "")
      : "No specific places are named in this chapter";
    const ppl = (c.people || []).map(p => person(p.id)).filter(Boolean);
    const shown = ppl.slice(0, 9);
    const avatars = '<ul class="t-avatars">' + shown.map(p => '<li class="' + (p.promise ? "promise" : "") + (p.sex === "f" ? " f" : "") + '"><span class="av" aria-hidden="true">' + esc(initials(p.name)) + '</span><span class="nm">' + esc(p.name) + "</span></li>").join("") +
      (ppl.length > shown.length ? '<li class="more"><span class="av">+' + (ppl.length - shown.length) + '</span><span class="nm">more</span></li>' : "") + "</ul>";
    const weave = '<svg class="weave" viewBox="0 0 30 10" aria-hidden="true"><path d="M0 5 Q 3.75 0 7.5 5 T 15 5 T 22.5 5 T 30 5"/></svg>';
    const tagline = BIBLE.taglinesMap[key] || "";

    view().innerHTML = '<div class="stage">' +
      '<div class="st-map" id="st-map"></div><div class="st-fade" aria-hidden="true"></div>' +
      nav.replace('class="ch-nav"', 'class="ch-nav st-nav"') +
      '<header class="st-title">' +
        '<div class="initial sm" aria-hidden="true"><span>' + n + "</span></div>" +
        '<div class="g-head">' +
          '<p class="ch-book"><a href="#/' + book.id + '">' + esc(book.name) + "</a> " + n + (sec ? '<span class="ch-sec">' + esc(sec.short || sec.title) + "</span>" : "") + "</p>" +
          "<h1>" + esc(c.title) + "</h1>" +
          (tagline ? '<p class="g-tag">' + esc(tagline) + "</p>" : "") +
          '<p class="st-actions"><button type="button" class="pill-btn primary" data-open="story">The story</button>' +
            (has("background") ? '<button type="button" class="pill-btn" data-open="background">Background</button>' : "") +
            '<button type="button" class="pill-btn" data-open="reflect">Reflect</button></p>' +
          (c.keyVerse ? '<p class="g-key">Key passage ' + R.link(c.keyVerse, book.id) + "</p>" : "") +
        "</div>" +
      "</header>" +
      '<aside class="st-left">' +
        (has("family") ? '<button type="button" class="st-block st-tree" data-open="family"><span class="st-label">' + esc(c.lineage.title || "Family") + '</span><div class="st-viz" id="st-tree"></div></button>' : "") +
        (has("people") ? '<button type="button" class="st-block" data-open="people"><span class="st-label">People</span>' + avatars + "</button>" : "") +
      "</aside>" +
      '<aside class="st-right">' +
        (has("words") ? '<button type="button" class="st-block" data-open="words"><span class="st-label">Words behind the English</span><ul class="st-words">' +
          study.words.slice(0, 4).map(it => { const w = BIBLE.words[it.id]; return w ? '<li><span class="script ' + w.lang + '" lang="he" dir="rtl">' + esc(w.lemma) + '</span><span class="wt"><span class="tl">' + esc(w.translit) + '</span><span class="wg">' + esc(firstGloss(w.gloss)) + "</span></span></li>" : ""; }).join("") +
          "</ul></button>" : "") +
        (has("threads") ? '<button type="button" class="st-block" data-open="threads"><span class="st-label">Story threads</span><ul class="st-threads">' +
          study.threads.map(t => '<li title="' + esc(t.note) + '">' + weave + esc((BIBLE.threads[t.id] || {}).short || t.id) + "</li>").join("") + "</ul></button>" : "") +
        (has("christ") ? '<button type="button" class="st-block" data-open="christ"><span class="st-label">Pointing to Christ</span><ul class="t-list">' +
          c.gospel.map(g => '<li class="g-' + (g.type || "theme") + '"><span class="dia"></span>' + esc(g.title) + "</li>").join("") + "</ul></button>" : "") +
      "</aside>" +
      '<button type="button" class="st-setting" data-open="' + (has("setting") ? "setting" : "story") + '"><span class="st-label">Setting</span><span class="st-cap">' + esc(settingCap) + "</span></button>" +
      '<button type="button" class="st-horizon" data-open="when">' +
        '<span class="hz-date"><span class="t-big">' + esc(shortDate(d) || era.name || "") + '</span><span class="t-sub">' + esc(era.name || "") + "</span></span>" +
        '<span class="st-viz hz-era" id="st-era"></span>' +
      "</button>" +
    "</div>";

    setHeadHeight();
    layoutStage();
    wireNav(book);
    wireTiles(view());

    BIBLE.map.render($("#st-map"), { places: c.places, journeys: c.journeys, stage: true, labels: true, padding: stagePadding() });
    if ($("#st-tree")) {
      const big = BIBLE.lineage.size(c.lineage) > 16;
      const hl = c.lineage.highlight || c.lineage.include || [];
      BIBLE.lineage.render($("#st-tree"), Object.assign({}, c.lineage, big && hl.length ? { include: hl } : {}, { fit: true }));
    }
    BIBLE.timeline.eraStrip($("#st-era"), { eraId: c.era, year: d.year, label: book.abbr[0] + " " + n });

    BIBLE.drawer.setup(secs, { base: "#/" + key, label: book.name + " " + n + ": " + c.title });
    if (sectionId) BIBLE.drawer.open(sectionId, { silent: true, keepFocus: true });
  }

  /* One story thread on a chapter page, with where it last appeared and where it surfaces next. */
  function threadItem(t, key) {
    const th = BIBLE.threads[t.id];
    if (!th) return "";
    const list = appears.threads[t.id] || [];
    const i = list.indexOf(key);
    const prev = i > 0 ? list[i - 1] : null, next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
    const hop = (k, label) => k ? '<a class="chip" href="#/' + k + '" title="' + esc((BIBLE.chapters[k] || {}).title || "") + '">' + label + " " + esc(chapterLabel(k)) + "</a>" : "";
    return '<li class="strand"><details><summary><span class="th-name">' + esc(th.name) + '</span><span class="th-note">' + R.linkify(t.note) + "</span></summary>" +
      '<div class="th-more"><p>' + R.linkify(th.summary) + "</p>" +
      '<p class="th-head"><span class="seen-l">Where it goes</span>' + R.linkify(th.heading) + "</p>" +
      '<p class="xrefs">' + th.refs.map(r => R.link(r)).join("") + "</p></div></details>" +
      '<p class="th-hops">' + hop(prev, "Before:") + hop(next, "Next:") +
        '<span class="th-count">In ' + list.length + " of " + Object.keys(BIBLE.chapters).length + " chapters</span></p></li>";
  }

  function section(id, title, body) {
    return '<section class="block" id="s-' + id + '"><h2>' + esc(title) + "</h2>" + body + "</section>";
  }

  /* Chapter navigation keeps the open drawer section, so you can follow one aspect (e.g. Words) chapter to chapter. */
  const keepSection = () => (BIBLE.drawer.current() ? "/" + BIBLE.drawer.current() : "");
  function wireNav(book) {
    const el = $("#ch-select");
    if (el) el.addEventListener("change", () => { location.hash = "#/" + book.id + "/" + el.value + keepSection(); });
    document.querySelectorAll("[data-pn]").forEach(a => a.addEventListener("click", e => {
      e.preventDefault();
      location.hash = "#/" + book.id + "/" + a.dataset.pn + keepSection();
    }));
  }

  function peopleView(id) {
    if (id && person(id)) return personView(id);
    setTitle("People");
    const list = Object.values(BIBLE.people).filter(p => appears.people[p.id]).sort((a, b) => a.name.localeCompare(b.name));
    view().innerHTML = '<div class="index-head"><h1>People</h1><p class="lede">Everyone who appears in the chapter guides so far. ' + list.length + ' people.</p>' +
      '<label class="search"><span class="sr">Filter people</span><input id="q" type="search" placeholder="Search by name, meaning or description" autocomplete="off"></label></div>' +
      '<ul class="people-index" id="plist">' + list.map(p => '<li data-s="' + esc((p.name + " " + (p.meaning || "") + " " + (p.bio || "") + " " + (p.aka || []).join(" ")).toLowerCase()) + '">' +
        '<a href="#/people/' + p.id + '"><span class="nm">' + esc(p.name) + "</span>" + (p.meaning ? '<span class="mn">' + esc(p.meaning) + "</span>" : "") +
        '<span class="ct">' + appears.people[p.id].length + (appears.people[p.id].length === 1 ? " chapter" : " chapters") + "</span></a></li>").join("") + "</ul>" +
      '<p class="empty" id="pnone" hidden>No one matches that search. Try part of a name, such as "Abra".</p>';
    const q = $("#q");
    q.addEventListener("input", () => {
      const v = q.value.trim().toLowerCase();
      let shown = 0;
      document.querySelectorAll("#plist li").forEach(li => { const ok = !v || li.dataset.s.includes(v); li.hidden = !ok; shown += ok; });
      $("#pnone").hidden = shown > 0;
    });
    q.focus();
  }

  function personView(id) {
    const p = person(id);
    setTitle(p.name);
    const f = family(id);
    const anc = BIBLE.lineage.ancestors(id);
    const root = anc[Math.min(anc.length - 1, 1)] || id;
    const famRow = (label, ids) => ids && ids.length ? "<div><dt>" + label + "</dt><dd>" + ids.map(plink).join(", ") + "</dd></div>" : "";
    const span = p.born != null ? BIBLE.timeline.fmtBC(p.born) + (p.died != null ? " to " + BIBLE.timeline.fmtBC(p.died) : "")
      : p.bornAM != null ? "AM " + p.bornAM + (p.diedAM != null ? " to AM " + p.diedAM : "") : "";
    const notes = (appears.people[id] || []).map(k => {
      const c = BIBLE.chapters[k];
      const item = (c.people || []).find(x => x.id === id);
      return '<li><a href="#/' + k + '"><span class="n">' + esc(chapterLabel(k)) + '</span><span class="t">' + esc(c.title) + "</span></a>" +
        (item && item.note ? "<p>" + R.linkify(item.note) + "</p>" : "") + "</li>";
    }).join("");
    view().innerHTML = '<p class="crumb"><a href="#/people">People</a></p>' +
      '<header class="person-hero"><h1>' + esc(p.name) + "</h1>" +
      (p.meaning ? '<p class="meaning big">' + esc(p.meaning) + "</p>" : "") +
      (p.aka ? '<p class="aka">Also called ' + p.aka.map(esc).join(", ") + "</p>" : "") +
      '<div class="lede">' + paras(p.bio) + "</div></header>" +
      '<div class="two">' +
        '<section class="block"><h2>Family</h2><dl class="facts fam-dl">' +
          famRow("Father", f.father ? [f.father] : []) + famRow("Mother", f.mother ? [f.mother] : []) +
          famRow(p.sex === "f" ? "Husband" : "Spouse", f.spouses) + famRow("Children", f.children) + famRow("Siblings", f.siblings) +
          (span ? "<div><dt>Lifetime</dt><dd>" + esc(span) + (p.age ? " (" + p.age + " years)" : "") + "</dd></div>" : "") +
        "</dl>" + ((p.refs || []).length ? '<p class="xrefs"><span class="seen-l">Elsewhere in Scripture</span>' + p.refs.map(r => R.link(r)).join("") + "</p>" : "") + "</section>" +
        '<section class="block"><h2>In the chapters</h2><ol class="appear-list">' + notes + "</ol></section>" +
      "</div>" +
      (root !== id || f.children.length ? '<section class="block"><h2>Family tree</h2><div id="p-tree" class="tree-wrap"></div>' + treeKey().replace("In this chapter", "This person") + "</section>" : "");
    if ($("#p-tree")) {
      const inc = [id, ...f.children, ...f.siblings];
      BIBLE.lineage.render($("#p-tree"), { root, include: inc, highlight: [id] });
    }
  }

  function placesView(id) {
    if (id && BIBLE.places[id]) return placeView(id);
    setTitle("Places");
    const ids = Object.keys(appears.places).filter(i => BIBLE.places[i]);
    const list = ids.map(i => Object.assign({ id: i }, BIBLE.places[i])).sort((a, b) => a.name.localeCompare(b.name));
    view().innerHTML = '<div class="index-head"><h1>Places</h1><p class="lede">Every location in the chapter guides so far. Select a pin or a name to see which chapters are set there.</p></div>' +
      '<div id="all-map" class="map tall"></div>' + mapKey() +
      '<ul class="place-index">' + list.map(p => '<li><a href="#/places/' + p.id + '"><span class="nm">' + esc(p.name) + "</span>" +
        (p.modern ? '<span class="mn">' + esc(p.modern) + "</span>" : "") + '<span class="ct">' + appears.places[p.id].length + "</span></a></li>").join("") + "</ul>";
    BIBLE.map.render($("#all-map"), { places: list.map(p => ({ id: p.id })), maxFitZoom: 5, ignoreRegionsInFit: true });
  }

  function placeView(id) {
    const p = BIBLE.places[id];
    setTitle(p.name);
    const chs = (appears.places[id] || []).map(k => {
      const c = BIBLE.chapters[k];
      const item = (c.places || []).find(x => x.id === id);
      return '<li><a href="#/' + k + '"><span class="n">' + esc(chapterLabel(k)) + '</span><span class="t">' + esc(c.title) + "</span></a>" +
        (item && item.role ? "<p>" + R.linkify(item.role) + "</p>" : "") + "</li>";
    }).join("");
    const cert = { known: "The location is known.", probable: "The location is probable but not certain.", uncertain: "The location is uncertain or disputed." }[p.certainty || "known"];
    view().innerHTML = '<p class="crumb"><a href="#/places">Places</a></p>' +
      '<header class="person-hero"><h1>' + esc(p.name) + "</h1>" + (p.modern ? '<p class="meaning big">' + esc(p.modern) + "</p>" : "") +
      '<div class="lede">' + paras(p.note) + '<p class="note">' + cert + (p.certNote ? " " + R.linkify(p.certNote) : "") + "</p></div></header>" +
      '<div class="two"><section class="block"><div id="pl-map" class="map"></div></section>' +
      '<section class="block"><h2>In the chapters</h2><ol class="appear-list">' + chs + "</ol></section></div>";
    BIBLE.map.render($("#pl-map"), { places: [{ id }], zoom: p.type === "region" ? 5 : 7 });
  }

  /* ---------- router ---------- */
  let lastRoute = "", renderedPage = "";
  async function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    // A book page is "book" or "book/chapter"; anything after that names a drawer section.
    const isChapter = parts[1] && /^\d+$/.test(parts[1]);
    const pageKey = BIBLE.getBook(parts[0]) ? parts.slice(0, isChapter ? 2 : 1).join("/") : parts.join("/");
    const sectionId = BIBLE.getBook(parts[0]) ? parts[isChapter ? 2 : 1] : null;
    if (pageKey === renderedPage && document.querySelector(".glance, .stage")) {
      if (sectionId) BIBLE.drawer.open(sectionId, { silent: true }); else BIBLE.drawer.close();
      return;
    }
    renderedPage = pageKey;
    const routeKey = pageKey;
    if (!sectionId) BIBLE.drawer.reset();
    BIBLE.map.destroyAll();
    // Bare refs like "(20:12)" resolve within the current book. People/place notes are written
    // from Genesis for now; set `book` on a person/place if other books are added later.
    R.setContext(BIBLE.getBook(parts[0]) ? parts[0] : "genesis");
    document.querySelectorAll(".viz-tip").forEach(t => (t.hidden = true));
    document.querySelectorAll(".site-nav a").forEach(a => a.classList.toggle("on",
      (parts[0] || "") === a.dataset.r || (a.dataset.r === "lib" && !["people", "places", "words"].includes(parts[0]))));
    try {
      if (!parts.length) home();
      else if (parts[0] === "people") { view().innerHTML = '<p class="loading">Loading people</p>'; await loadAllReady(); peopleView(parts[1]); }
      else if (parts[0] === "words") {
        view().innerHTML = '<p class="loading">Loading words</p>';
        await loadAllReady();
        if (parts[1] && BIBLE.words[parts[1]]) await BIBLE.wordsUI.wordView(view(), parts[1], appears.words, chapterLabel, loadScript);
        else BIBLE.wordsUI.indexView(view(), appears.words);
      }
      else if (parts[0] === "places") { view().innerHTML = '<p class="loading">Loading places</p>'; await loadAllReady(); placesView(parts[1]); }
      else {
        const book = BIBLE.getBook(parts[0]);
        if (!book) { view().innerHTML = '<div class="narrow"><h1>Page not found</h1><p>There is no page at this address. <a href="#/">Go to the library</a>.</p></div>'; }
        else if (!book.ready) notReady(book);
        else {
          if (!BIBLE.bookInfo[book.id]) view().innerHTML = '<p class="loading">Loading ' + esc(book.name) + "</p>";
          await loadBook(book.id);
          const n = parseInt(parts[1], 10);
          if (n >= 1 && n <= book.chapters) chapterView(book, n, sectionId);
          else bookView(book, sectionId);
        }
      }
    } catch (err) {
      console.error(err);
      view().innerHTML = '<div class="narrow"><h1>This page didn\'t load</h1><p>' + esc(err.message) + '</p><p>Reload the page to try again.</p></div>';
    }
    if (routeKey !== lastRoute) window.scrollTo(0, 0);
    lastRoute = routeKey;
    view().focus({ preventScroll: true });
  }

  /* ---------- chrome: theme, version, keys ---------- */
  function initChrome() {
    const sel = $("#version");
    sel.innerHTML = R.VERSIONS.map(v => "<option" + (v === R.version ? " selected" : "") + ">" + v + "</option>").join("");
    sel.addEventListener("change", () => { R.setVersion(sel.value); route(); });

    const btn = $("#theme");
    const apply = t => {
      if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
      const dark = t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      btn.setAttribute("aria-pressed", String(dark));
      btn.textContent = dark ? "Light pages" : "Dark pages";
    };
    let saved = null;
    try { saved = localStorage.getItem("theme"); } catch (e) {}
    apply(saved);
    btn.addEventListener("click", () => {
      const dark = btn.getAttribute("aria-pressed") === "true";
      const t = dark ? "light" : "dark";
      try { localStorage.setItem("theme", t); } catch (e) {}
      apply(t);
      route();
    });

    document.addEventListener("keydown", e => {
      if (e.target.closest("input, select, textarea") || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const parts = location.hash.replace(/^#\/?/, "").split("/");
      const book = BIBLE.getBook(parts[0]); const n = parseInt(parts[1], 10);
      if (!book || !n) return;
      const m = e.key === "ArrowLeft" ? n - 1 : n + 1;
      if (m >= 1 && m <= book.chapters) location.hash = "#/" + book.id + "/" + m + keepSection();
    });
  }

  window.addEventListener("hashchange", route);
  document.addEventListener("DOMContentLoaded", () => { initChrome(); route(); });
})();
