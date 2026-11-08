/* Global data registry. Data files call these registration helpers. */
window.BIBLE = {
  books: [],
  eras: [],
  worldEvents: [],
  places: {},
  people: {},
  words: {},
  wordStats: {},   // generated: { id: { total, byBook: {bookId: n}, glosses: [[gloss, n], ...] } }
  wordRefs: {},    // generated, loaded on demand: { id: { bookId: "1:1,1:27,..." } }
  threads: {},
  bookInfo: {},
  chapters: {},
  studies: {},     // { "genesis/12": { words:[...], threads:[...] } }
  addPlaces(obj) { Object.assign(this.places, obj); },
  addPeople(obj) {
    for (const [id, p] of Object.entries(obj)) this.people[id] = Object.assign({ id }, p);
  },
  addWords(obj) {
    for (const [id, w] of Object.entries(obj)) this.words[id] = Object.assign({ id }, w);
  },
  addThreads(obj) {
    for (const [id, t] of Object.entries(obj)) this.threads[id] = Object.assign({ id }, t);
  },
  book(id, data) { this.bookInfo[id] = data; },
  chapter(book, n, data) { this.chapters[book + "/" + n] = Object.assign({ book, n }, data); },
  /* Word and thread annotations for a whole book: { chapterNumber: { words:[{id, ref, note}], threads:[{id, note}] } } */
  study(book, byChapter) {
    for (const [n, s] of Object.entries(byChapter)) this.studies[book + "/" + n] = s;
  },
  taglinesMap: {},
  /* One-line takeaways for each chapter: { chapterNumber: "..." } */
  taglines(book, byChapter) {
    for (const [n, t] of Object.entries(byChapter)) this.taglinesMap[book + "/" + n] = t;
  },
  getBook(id) { return this.books.find(b => b.id === id); },
};
