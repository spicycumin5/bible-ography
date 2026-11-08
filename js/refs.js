/* Scripture reference parsing and BibleGateway links. */
(function () {
  const VERSIONS = ["ESV", "NIV", "NKJV", "KJV", "CSB", "NASB", "NLT"];
  let version = "ESV";
  try { version = localStorage.getItem("bg-version") || "ESV"; } catch (e) {}

  // name/abbr -> book
  const lookup = {};
  const keys = [];
  function norm(s) { return s.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim(); }
  function index() {
    for (const b of BIBLE.books) {
      for (const k of [b.name, ...b.abbr]) {
        lookup[norm(k)] = b;
        keys.push(k);
      }
    }
    keys.sort((a, b) => b.length - a.length);
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  let refRe = null;
  function regex() {
    if (!refRe) {
      if (!keys.length) index();
      const names = keys.map(k => escapeRe(k).replace(/\\ /g, "\\s?").replace(/ /g, "\\s?")).join("|");
      // Book  chapter[:verse[-verse]][, verse...]  (also "Rom 4" chapter-only, "Gen 12:1–3" en dash)
      refRe = new RegExp("\\b(" + names + ")\\.?\\s(\\d{1,3})(?::(\\d{1,3}(?:[-–]\\d{1,3})?(?:,\\s?\\d{1,3}(?:[-–]\\d{1,3})?)*))?(?:[-–](\\d{1,3}):(\\d{1,3}))?\\b", "g");
    }
    return refRe;
  }

  function findBook(name) {
    if (!keys.length) index();
    return lookup[norm(name)] || lookup[norm(name.replace(/^(\d)(\D)/, "$1 $2"))];
  }

  /* Parse "Gal 3:8" or (with ctxBook) "12:3". Returns {book, chapter, verses, label, search} or null. */
  function parse(str, ctxBook) {
    str = String(str).trim();
    let m = str.match(/^(\d{1,3})(?::(.+))?$/);
    let book, chapter, verses;
    if (m && ctxBook) {
      book = BIBLE.getBook(ctxBook); chapter = +m[1]; verses = m[2] || "";
    } else {
      const re = new RegExp(regex().source); // non-global copy: don't disturb linkify's loop
      m = re.exec(str);
      if (!m) return null;
      book = findBook(m[1]); chapter = +m[2]; verses = m[3] || "";
      if (m[4]) verses = (verses || "1") + "–" + m[4] + ":" + m[5];
    }
    if (!book) return null;
    verses = verses.replace(/-/g, "–");
    const tail = chapter + (verses ? ":" + verses : "");
    const shortName = book.name.length <= 5 ? book.name : (book.abbr[0] || book.name);
    return {
      book, chapter, verses,
      label: shortName + " " + tail,
      search: book.name + " " + tail.replace(/–/g, "-"),
    };
  }

  function url(ref) {
    return "https://www.biblegateway.com/passage/?search=" + encodeURIComponent(ref.search) + "&version=" + version;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* HTML for one reference chip. */
  function link(str, ctxBook, label) {
    const r = parse(str, ctxBook);
    if (r && label) r.label = label;
    if (!r) return '<span class="ref">' + esc(str) + "</span>";
    return '<a class="ref" target="_blank" rel="noopener" href="' + url(r) + '" title="Read ' + esc(r.search) + " (" + version + ') on BibleGateway">' + esc(r.label) + "</a>";
  }

  /* Escape plain text and turn any references in it into links. */
  let ctx = null; // current book, so bare "20:12" links within it
  function linkify(text) {
    const bare = ctx ? "|(?<![\\w:.])(\\d{1,3}:\\d{1,3}(?:[-–]\\d{1,3})?)(?![\\d:])" : "";
    const re = new RegExp("(?:" + regex().source + ")" + bare, "g");
    let out = "", last = 0, m;
    const s = String(text);
    while ((m = re.exec(s))) {
      const isBare = ctx && m[6];
      out += esc(s.slice(last, m.index)) + (isBare ? link(m[6], ctx, m[6]) : link(m[0], null, m[0]));
      last = m.index + m[0].length;
    }
    return out + esc(s.slice(last));
  }

  BIBLE.refs = {
    parse, link, linkify, url, esc, VERSIONS,
    setContext(b) { ctx = b || null; },
    get version() { return version; },
    setVersion(v) { version = v; try { localStorage.setItem("bg-version", v); } catch (e) {} },
  };
})();
