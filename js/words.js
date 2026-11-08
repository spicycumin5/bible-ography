/* Original-language word studies: chapter cards, the Words index, and each word's page. */
(function () {
  const R = BIBLE.refs;
  const esc = R.esc;
  const NS = "http://www.w3.org/2000/svg";
  const LANG = { he: "Hebrew", gr: "Greek" };

  const fmt = n => n.toLocaleString("en");
  const script = w => '<span class="script ' + w.lang + '" lang="' + (w.lang === "he" ? "he" : "grc") + '"' +
    (w.lang === "he" ? ' dir="rtl"' : "") + ">" + esc(w.lemma) + "</span>";
  const strongsLabel = w => w.strongs.map(s => s.replace(/^([HG])0*(\d+)[A-Z]?$/, "$1$2")).filter((v, i, a) => a.indexOf(v) === i).join(", ");
  const blb = w => {
    const s = w.strongs[0].replace(/^([HG])0*(\d+)[A-Z]?$/, (m, l, d) => l.toLowerCase() + d);
    return "https://www.blueletterbible.org/lexicon/" + s + "/" + (w.lang === "he" ? "kjv/wlc" : "kjv/tr") + "/0-1/";
  };
  const step = w => "https://www.stepbible.org/?q=strong=" + w.strongs[0].replace(/[A-Z]$/, "");
  const stats = id => BIBLE.wordStats[id] || { total: 0, verses: 0, byBook: {}, glosses: [] };
  const books = () => BIBLE.books;

  /* Tiny 66-bar distribution; the current book is marked. */
  function sparkline(id, currentBook) {
    const st = stats(id);
    const max = Math.max(1, ...Object.values(st.byBook));
    const W = 66 * 3 + 4, H = 22;
    let bars = "";
    books().forEach((b, i) => {
      const v = st.byBook[b.id] || 0;
      const h = v ? Math.max(2, Math.round((Math.sqrt(v) / Math.sqrt(max)) * (H - 2))) : 0;
      const x = i * 3 + (b.testament === "NT" ? 4 : 0);
      bars += '<rect x="' + x + '" y="' + (H - h) + '" width="2" height="' + h + '" class="' + (b.id === currentBook ? "cur" : b.testament) + '"/>';
    });
    return '<svg class="spark" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Where it occurs across the Bible, Old Testament then New">' +
      '<line x1="0" x2="' + W + '" y1="' + (H - 0.5) + '" y2="' + (H - 0.5) + '" class="base"/>' + bars + "</svg>";
  }

  /* Card shown on a chapter page. item: {id, ref, note} */
  function card(item, bookId) {
    const w = BIBLE.words[item.id];
    if (!w) return "";
    const st = stats(w.id);
    const inBook = st.byBook[bookId] || 0;
    const bookName = (BIBLE.getBook(bookId) || {}).name;
    return '<article class="wcard ' + w.lang + '">' +
      '<header><a class="wlink" href="#/words/' + w.id + '">' + script(w) + '<span class="tl">' + esc(w.translit) + "</span></a>" +
        '<p class="wgloss">' + esc(w.gloss) + "</p></header>" +
      '<p class="wnote">' + R.link(item.ref, bookId) + " " + R.linkify(item.note) + "</p>" +
      '<p class="wwhy">' + R.linkify(w.why) + "</p>" +
      '<footer><div class="wcount">' + sparkline(w.id, bookId) +
        "<span>" + fmt(st.total) + " times in the " + (w.lang === "he" ? "Old" : "New") + " Testament" +
        (inBook ? ", " + inBook + " in " + esc(bookName) : "") + "</span></div>" +
        '<a href="#/words/' + w.id + '">Every occurrence</a></footer>' +
    "</article>";
  }

  /* ---------- Words index ---------- */
  function indexView(view, appears) {
    document.title = "Words | Bible-ography";
    const col = lang => {
      const list = Object.values(BIBLE.words).filter(w => w.lang === lang).sort((a, b) => a.translit.replace(/^['ʼ]/, "").localeCompare(b.translit.replace(/^['ʼ]/, "")));
      return '<section class="wcol"><h2>' + LANG[lang] + '</h2><ul class="word-index">' + list.map(w =>
        '<li data-s="' + esc((w.translit + " " + w.gloss + " " + w.lemma).toLowerCase()) + '"><a href="#/words/' + w.id + '">' + script(w) +
        '<span class="tl">' + esc(w.translit) + '</span><span class="wg">' + esc(w.gloss) + '</span><span class="ct">' + fmt(stats(w.id).total) + "</span></a></li>").join("") + "</ul></section>";
    };
    view.innerHTML = '<div class="index-head"><h1>Words behind the English</h1>' +
      '<p class="lede">Hebrew and Greek words whose meaning is richer or different from any single English word. Each page shows its range of meaning, how it is translated, and every place it occurs.</p>' +
      '<label class="search"><span class="sr">Filter words</span><input id="wq" type="search" placeholder="Search by word or meaning, such as love or spirit" autocomplete="off"></label></div>' +
      '<div class="two">' + col("he") + col("gr") + "</div>" +
      '<p class="empty" id="wnone" hidden>No word matches that search. Try an English meaning, such as "grace".</p>' + credit();
    const q = document.getElementById("wq");
    q.addEventListener("input", () => {
      const v = q.value.trim().toLowerCase();
      let shown = 0;
      document.querySelectorAll(".word-index li").forEach(li => { const ok = !v || li.dataset.s.includes(v); li.hidden = !ok; shown += ok; });
      document.getElementById("wnone").hidden = shown > 0;
    });
  }

  const credit = () => '<p class="credit">Counts, verse lists and glosses are generated from the STEPBible.org tagged Hebrew (Leningrad Codex) and Greek (Nestle-Aland) texts, licensed CC BY 4.0. Hebrew references follow English verse numbering.</p>';

  /* ---------- One word ---------- */
  async function wordView(view, id, appears, chapterLabel, loadScript) {
    const w = BIBLE.words[id];
    const st = stats(id);
    document.title = w.translit + " | Bible-ography";
    const tagged = appears[id] || [];
    const tagNotes = tagged.map(k => {
      const s = BIBLE.studies[k];
      const item = (s.words || []).find(x => x.id === id);
      const c = BIBLE.chapters[k];
      const [b] = k.split("/");
      return '<li><a href="#/' + k + '"><span class="n">' + esc(chapterLabel(k)) + '</span><span class="t">' + esc(c ? c.title : "") + "</span></a>" +
        "<p>" + R.link(item.ref, b) + " " + R.linkify(item.note) + "</p></li>";
    }).join("");
    const cps = (w.counterparts || []).map(cid => BIBLE.words[cid]).filter(Boolean);
    const glossMax = Math.max(1, ...st.glosses.map(g => g[1]));
    const nBooks = Object.keys(st.byBook).length;

    view.innerHTML = '<p class="crumb"><a href="#/words">Words</a></p>' +
      '<header class="word-hero ' + w.lang + '">' +
        '<p class="big-script">' + script(w) + "</p>" +
        '<div><h1>' + esc(w.translit) + "</h1>" +
        '<p class="meaning big">' + esc(w.gloss) + "</p>" +
        '<p class="wmeta">' + LANG[w.lang] + ", Strong's " + esc(strongsLabel(w)) + ". " +
          '<strong>' + fmt(st.total) + "</strong> occurrences in " + fmt(st.verses) + " verses across " + nBooks + (nBooks === 1 ? " book" : " books") + ".</p></div>" +
      "</header>" +
      '<div class="two">' +
        '<section class="block"><h2>Range of meaning</h2><div class="prose">' + "<p>" + R.linkify(w.senses) + "</p></div>" +
          '<h3 class="minor">Why English struggles</h3><div class="prose"><p>' + R.linkify(w.why) + "</p></div>" +
          (cps.length ? '<h3 class="minor">' + (w.lang === "he" ? "In the New Testament" : "Behind it in the Old Testament") + "</h3>" +
            '<ul class="cp-list">' + cps.map(c => '<li><a href="#/words/' + c.id + '">' + script(c) + '<span class="tl">' + esc(c.translit) + "</span></a>" +
              '<span class="wg">' + esc(c.gloss) + ", " + fmt(stats(c.id).total) + " times</span></li>").join("") + "</ul>" +
            '<p class="note">' + (w.lang === "he"
              ? "The Greek translation of the Old Testament (the Septuagint), read by the apostles, usually rendered this word with the Greek shown here, so the New Testament word carries its Hebrew background."
              : "The Septuagint used this Greek word to translate the Hebrew shown here, which shaped what it means in the New Testament.") + "</p>" : "") +
        "</section>" +
        '<section class="block"><h2>How it is translated</h2>' +
          '<p class="note">The most frequent English glosses STEPBible gives this word in context. Forms of a verb are counted separately.</p>' +
          '<ul class="gloss-bars">' + st.glosses.map(g => '<li><span class="gl">' + esc(g[0]) + '</span><span class="gb"><span style="width:' +
            Math.max(2, (g[1] / glossMax) * 100).toFixed(1) + '%"></span></span><span class="gn">' + fmt(g[1]) + "</span></li>").join("") + "</ul>" +
          '<p class="ext"><a href="' + blb(w) + '" target="_blank" rel="noopener">Lexicon entry on Blue Letter Bible</a> <a href="' + step(w) + '" target="_blank" rel="noopener">Search it on STEPBible</a></p>' +
        "</section>" +
      "</div>" +
      '<section class="block"><h2>Where it appears</h2><p class="note">Occurrences per book. Select a bar to jump to that book\'s verses.' +
        (w.lang === "he" ? " Hebrew words appear only in the Old Testament; follow the Greek counterpart above to trace the idea into the New." : " Greek words are counted in the New Testament only; the Hebrew counterpart above traces the idea through the Old.") + "</p>" +
        '<div id="wdist" class="tl"></div></section>' +
      (tagNotes ? '<section class="block"><h2>In the chapter guides</h2><ol class="appear-list">' + tagNotes + "</ol></section>" : "") +
      '<section class="block"><h2>Every occurrence</h2><div id="wrefs"><p class="loading">Loading verses</p></div></section>' + credit();

    distribution(document.getElementById("wdist"), id);
    await loadScript("data/word-refs/" + id + ".js");
    const refs = BIBLE.wordRefs[id] || {};
    const host = document.getElementById("wrefs");
    if (!host) return;
    host.innerHTML = books().filter(b => refs[b.id]).map(b => {
      const vs = refs[b.id].split(",");
      const chips = vs.map(v => R.link(b.name + " " + v, null, v)).join("");
      return '<details class="occ" id="occ-' + b.id + '"' + (vs.length <= 40 ? " open" : "") + '><summary><span class="ob">' + esc(b.name) +
        '</span><span class="oc">' + fmt(st.byBook[b.id] || vs.length) + "</span></summary><p class='ochips'>" + chips + "</p></details>";
    }).join("") || '<p class="empty">No verse list has been generated for this word. Run node tools/build-words.js.</p>';
  }

  /* Bar chart of occurrences per book, grouped by section of the canon. */
  function distribution(host, id) {
    const st = stats(id);
    const W = Math.max(host.clientWidth || 800, 320), H = 190, top = 14, base = 140;
    const gap = 8, n = books().length;
    const slot = (W - gap) / n;
    const max = Math.max(1, ...Object.values(st.byBook));
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", "100%"); svg.setAttribute("height", H);
    svg.setAttribute("class", "wdist"); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Occurrences of " + BIBLE.words[id].translit + " in each book of the Bible");
    let html = "";
    // y grid: 0, max/2, max
    [0, 0.5, 1].forEach(f => {
      const y = base - f * (base - top);
      html += '<line class="grid" x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '"/>';
      if (f) html += '<text class="tick" x="2" y="' + (y - 3) + '">' + fmt(Math.round(max * f)) + "</text>";
    });
    let groups = [];
    books().forEach((b, i) => {
      const x = i * slot + (b.testament === "NT" ? gap : 0);
      const v = st.byBook[b.id] || 0;
      const h = v ? Math.max(2, (v / max) * (base - top)) : 0;
      const bw = Math.max(2, slot - 2);
      html += '<g class="wbar' + (v ? "" : " zero") + '" data-b="' + b.id + '" data-v="' + v + '" data-n="' + esc(b.name) + '">' +
        '<rect class="hit" x="' + x + '" y="' + top + '" width="' + slot + '" height="' + (base - top + 4) + '"/>' +
        (v ? '<rect class="bar ' + b.testament + '" x="' + (x + 1) + '" y="' + (base - h) + '" width="' + bw + '" height="' + h + '" rx="' + Math.min(2, bw / 2) + '"/>' : "") + "</g>";
      const g = groups[groups.length - 1];
      if (!g || g.name !== b.genre || g.t !== b.testament) groups.push({ name: b.genre, t: b.testament, x0: x, x1: x + slot });
      else g.x1 = x + slot;
    });
    groups.forEach((g, i) => {
      html += '<line class="bracket" x1="' + (g.x0 + 1) + '" x2="' + (g.x1 - 1) + '" y1="' + (base + 8) + '" y2="' + (base + 8) + '"/>';
      const label = { "Wisdom & Poetry": "Wisdom", "Major Prophets": "Major Proph.", "Minor Prophets": "Minor Proph.", "Pauline Letters": "Paul", "General Letters": "Letters" }[g.name] || g.name;
      if (g.x1 - g.x0 > 26) html += '<text class="glabel" x="' + ((g.x0 + g.x1) / 2) + '" y="' + (base + 22 + (i % 2) * 12) + '" text-anchor="middle">' + esc(label) + "</text>";
    });
    html += '<text class="tick" x="0" y="' + (H - 2) + '">Old Testament</text><text class="tick" x="' + W + '" y="' + (H - 2) + '" text-anchor="end">New Testament</text>';
    svg.innerHTML = html;
    host.innerHTML = "";
    host.appendChild(svg);
    let tip = document.querySelector(".viz-tip");
    if (!tip) { tip = document.createElement("div"); tip.className = "viz-tip"; tip.hidden = true; document.body.appendChild(tip); }
    svg.querySelectorAll(".wbar").forEach(g => {
      g.addEventListener("mousemove", e => {
        tip.innerHTML = "<strong>" + g.dataset.n + "</strong><br>" + (+g.dataset.v ? fmt(+g.dataset.v) + (+g.dataset.v === 1 ? " occurrence" : " occurrences") : "Does not occur");
        tip.hidden = false;
        tip.style.left = Math.min(e.clientX + 14, innerWidth - 180) + "px"; tip.style.top = (e.clientY + 14) + "px";
      });
      g.addEventListener("mouseleave", () => { tip.hidden = true; });
      g.addEventListener("click", () => {
        const d = document.getElementById("occ-" + g.dataset.b);
        if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); }
      });
    });
  }

  BIBLE.wordsUI = { card, indexView, wordView, sparkline };
})();
