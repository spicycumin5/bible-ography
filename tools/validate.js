/* Checks all data files: every chapter exists and loads, and every person/place/era id resolves.
   Run:  node tools/validate.js */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
global.window = global;
global.localStorage = { getItem() { return null; }, setItem() {} };
const load = f => { (0, eval)(fs.readFileSync(path.join(root, f), "utf8")); };
["js/core.js", "data/books.js", "data/eras.js", "data/places.js", "data/people.js", "data/words.js", "data/threads.js", "data/word-stats.js", "js/refs.js", "js/lineage.js"].forEach(load);

const problems = [];
const warn = m => problems.push(m);
function checkTree(at, l) {
  for (const id of l.include || []) {
    if (BIBLE.people[id] && id !== l.root && !BIBLE.lineage.ancestors(id).includes(l.root)) warn(`${at}: lineage "${id}" is not a descendant of root "${l.root}"`);
  }
}
const eras = new Set(BIBLE.eras.map(e => e.id));

// people registry integrity
for (const p of Object.values(BIBLE.people)) {
  for (const k of ["father", "mother"]) if (p[k] && !BIBLE.people[p[k]]) warn(`people.${p.id}.${k} -> unknown "${p[k]}"`);
  for (const s of p.spouses || []) if (!BIBLE.people[s]) warn(`people.${p.id}.spouses -> unknown "${s}"`);
}

// word registry integrity
for (const w of Object.values(BIBLE.words)) {
  for (const c of w.counterparts || []) if (!BIBLE.words[c]) warn(`words.${w.id}.counterparts -> unknown "${c}"`);
  if (!BIBLE.wordStats[w.id]) warn(`words.${w.id}: no generated stats (run node tools/build-words.js)`);
}
const refList = id => {
  const f = path.join(root, "data", "word-refs", id + ".js");
  if (!BIBLE.wordRefs[id] && fs.existsSync(f)) load(path.join("data", "word-refs", id + ".js"));
  return BIBLE.wordRefs[id] || {};
};

let chapters = 0;
for (const b of BIBLE.books.filter(b => b.ready)) {
  const dir = path.join("data", b.id);
  if (fs.existsSync(path.join(root, dir, "book.js"))) load(path.join(dir, "book.js"));
  else warn(`${b.id}: missing book.js`);
  const info = BIBLE.bookInfo[b.id] || {};
  if (info.lineage) checkTree(b.id + " book", info.lineage);
  if (info.lineage) for (const id of [info.lineage.root, ...(info.lineage.include || [])]) if (!BIBLE.people[id]) warn(`${b.id} book lineage -> unknown person "${id}"`);
  for (const t of info.timeline || []) for (const id of t.people) if (!BIBLE.people[id]) warn(`${b.id} book timeline -> unknown person "${id}"`);
  if (fs.existsSync(path.join(root, dir, "study.js"))) load(path.join(dir, "study.js"));
  for (let n = 1; n <= b.chapters; n++) {
    const f = path.join(dir, String(n).padStart(2, "0") + ".js");
    if (!fs.existsSync(path.join(root, f))) { warn(`${b.id} ${n}: file missing`); continue; }
    try { load(f); } catch (e) { warn(`${b.id} ${n}: ${e.message}`); continue; }
    const c = BIBLE.chapters[b.id + "/" + n];
    if (!c) { warn(`${b.id} ${n}: file did not register chapter ${n}`); continue; }
    chapters++;
    const at = `${b.id} ${n}`;
    for (const k of ["title", "summary", "era"]) if (!c[k]) warn(`${at}: missing ${k}`);
    if (c.era && !eras.has(c.era)) warn(`${at}: unknown era "${c.era}"`);
    for (const p of c.places || []) if (!BIBLE.places[p.id]) warn(`${at}: unknown place "${p.id}"`);
    for (const j of c.journeys || []) for (const id of j.path) if (!BIBLE.places[id]) warn(`${at}: journey unknown place "${id}"`);
    for (const p of c.people || []) if (!BIBLE.people[p.id]) warn(`${at}: unknown person "${p.id}"`);
    if (c.lineage) checkTree(at, c.lineage);
    if (c.lineage) for (const id of [c.lineage.root, ...(c.lineage.include || []), ...(c.lineage.highlight || [])]) if (!BIBLE.people[id]) warn(`${at}: lineage unknown person "${id}"`);
    if (c.timeline && c.timeline.people) for (const id of c.timeline.people) if (!BIBLE.people[id]) warn(`${at}: timeline unknown person "${id}"`);
    const st = BIBLE.studies[b.id + "/" + n];
    if (st) {
      for (const w of st.words || []) {
        if (!BIBLE.words[w.id]) { warn(`${at}: study word unknown "${w.id}"`); continue; }
        const m = String(w.ref).match(/^(\d+):(\d+)/);
        if (!m || +m[1] !== n) { warn(`${at}: study word "${w.id}" ref ${w.ref} is not in this chapter`); continue; }
        const list = (refList(w.id)[b.id] || "").split(",");
        if (!list.includes(m[1] + ":" + m[2])) warn(`${at}: "${w.id}" does not occur in ${b.id} ${w.ref} per STEPBible data`);
        if (!w.note) warn(`${at}: study word "${w.id}" has no note`);
      }
      for (const t of st.threads || []) if (!BIBLE.threads[t.id]) warn(`${at}: unknown thread "${t.id}"`);
    }
    const refs = [c.keyVerse, ...(c.outline || []).map(o => o.ref), ...(c.crossrefs || []), ...(c.gospel || []).flatMap(g => [g.ot, ...(g.nt || [])])].filter(Boolean);
    for (const r of refs) if (!BIBLE.refs.parse(r, b.id)) warn(`${at}: unparseable reference "${r}"`);
  }
}

console.log(`Checked ${chapters} chapters, ${Object.keys(BIBLE.people).length} people, ${Object.keys(BIBLE.places).length} places.`);
if (problems.length) { console.log(problems.length + " problem(s):\n  " + problems.join("\n  ")); process.exit(1); }
console.log("All references resolve.");
