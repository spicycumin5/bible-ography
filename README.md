# Bible-ography

A chapter-by-chapter companion for reading the Bible. Each chapter guide has its setting on a map, family trees, a timeline, the people involved, historical background, connections to the gospel, and reflection questions. Genesis is complete; the library lists all 66 books so the others can be added the same way.

## Opening it

Double-click `index.html`. It runs straight from the folder with no install and no server. It needs an internet connection for the fonts, the map tiles, and the two libraries (Leaflet for maps, D3 for trees).

Each chapter opens as one full-window landscape. The chapter's land, a relief map with its places and journeys, fills the screen and everything else rests on its faded edges:
- the title at top-left;
- the family tree and people on the left;
- the Hebrew words, story threads and links to Christ on the right;
- the timeline along the bottom like a horizon.

Scroll to zoom the map and drag to pan. Click anything, or "The story", "Background" or "Reflect", to open the full detail in a side drawer with a tab for every section. The Genesis overview works the same way, with the 50 chapters as a ribbon along the bottom.

Use the left and right arrow keys to move between chapters. If the drawer is open, it stays on the same tab, so you can follow one thing (say, the Words) through the book. Esc closes the drawer. Verse references open on BibleGateway in the translation picked in the header.

## How it's organised

```
index.html            page shell
css/styles.css        all styling (light and dark themes)
js/                   app logic: router + views (app.js), maps, family trees, timelines, reference links
data/books.js         the 66 books
data/eras.js          eras of biblical history and wider-world events
data/places.js        every place: coordinates and how certain the location is
data/people.js        every person: family links, lifespans, short bio
data/words.js         Hebrew/Greek word studies: meaning, why English falls short, counterparts
data/threads.js       story threads (themes and plotlines) that run through the Bible
data/word-stats.js    generated: occurrence counts per book and common glosses
data/word-refs/       generated: every verse each word occurs in
data/genesis/         book.js (overview), 01.js to 50.js (one per chapter), study.js (words + threads), glance.js (one-line takeaways)
tools/validate.js     checks the data for mistakes
tools/build-words.js  regenerates word counts and verse lists from STEPBible's tagged texts
tools/sources/        the STEPBible source files (not loaded by the app)
```

People and places are written once in the shared files. Family trees, the "appears in" lists and the People/Places pages are all built from them.

## Word studies and story threads

Each chapter page has a **Story threads** panel and a **Words behind the English** panel. Their per-chapter notes live in `data/<book>/study.js`.

Word counts and verse lists are exact. They come from STEPBible's tagged Hebrew (Leningrad Codex) and Greek (Nestle-Aland) texts, licensed CC BY 4.0. To add a word:

1. Add it to `data/words.js` with its Strong's number(s).
2. Run `node tools/build-words.js` (takes about 30 seconds).
3. Tag it in a chapter's `study.js` entry.

The validator checks that a tagged word really occurs in the verse you cite. If the STEPBible files are missing, download the `TAHOT` and `TAGNT` files from the "Translators Amalgamated OT+NT" folder of github.com/STEPBible/STEPBible-Data into `tools/sources/stepbible/`.

## Adding another book

1. In `data/books.js`, add `ready: true` to the book.
2. Create `data/<book-id>/book.js` (copy the shape of `data/genesis/book.js`) and one file per chapter, `01.js`, `02.js`, … (copy the shape of any Genesis chapter).
3. Add any new people to `data/people.js` and places to `data/places.js`. Optionally add `study.js` for word studies and story threads.
4. Run `node tools/validate.js`. It reports unknown ids, broken references, and family-tree entries that don't descend from the tree's root.

## Notes on the content

The guides follow a broadly evangelical, Christ-centred reading. Where scholars disagree, the guides say so rather than picking a side silently. That covers dates (traditional vs. other views), place identifications (each place is marked known, probable or uncertain), and interpretive questions such as the "sons of God" in Genesis 6.
