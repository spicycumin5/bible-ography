/* Eras of biblical history. Years: negative = BC, positive = AD.
   Dates follow a conservative "early Exodus" chronology (1 Kings 6:1 → c. 1446 BC);
   individual chapters note scholarly alternatives. */
BIBLE.eras = [
  { id: "primeval", name: "Primeval history", start: null, end: null,
    note: "Creation to Babel (Gen 1–11). The text gives genealogies with ages, but no fixed calendar date can be assigned with confidence; evangelical scholars hold a range of views on how the genealogies map to absolute time." },
  { id: "patriarchs", name: "Patriarchs", start: -2166, end: -1876,
    note: "Abraham, Isaac and Jacob in Canaan. Most scholars place the patriarchal setting in the Middle Bronze Age (c. 2000–1550 BC)." },
  { id: "egypt", name: "Israel in Egypt", start: -1876, end: -1446,
    note: "From Jacob's descent to Egypt to the Exodus (430 years, Exod 12:40). A 'late Exodus' view dates the Exodus c. 1260 BC instead." },
  { id: "wilderness", name: "Exodus & wilderness", start: -1446, end: -1406 },
  { id: "conquest", name: "Conquest & judges", start: -1406, end: -1050 },
  { id: "united", name: "United kingdom", start: -1050, end: -931 },
  { id: "divided", name: "Divided kingdom", start: -931, end: -586 },
  { id: "exile", name: "Exile", start: -586, end: -538 },
  { id: "return", name: "Return & restoration", start: -538, end: -430 },
  { id: "intertestamental", name: "Between the Testaments", start: -430, end: -5 },
  { id: "christ", name: "Life of Christ", start: -5, end: 30 },
  { id: "church", name: "Early church", start: 30, end: 100 },
];

/* Wider world: what else was happening, for context. Approximate dates. */
BIBLE.worldEvents = [
  { name: "Old Kingdom Egypt (pyramids)", start: -2686, end: -2181 },
  { name: "Akkadian empire (Sargon)", start: -2334, end: -2154 },
  { name: "Ur III dynasty, Sumer", start: -2112, end: -2004 },
  { name: "Middle Kingdom Egypt", start: -2055, end: -1650 },
  { name: "Old Babylonian period (Hammurabi c. 1792–1750)", start: -1894, end: -1595 },
  { name: "Hyksos rule in Lower Egypt", start: -1650, end: -1550 },
  { name: "New Kingdom Egypt", start: -1550, end: -1070 },
  { name: "Hittite empire", start: -1650, end: -1180 },
  { name: "Neo-Assyrian empire", start: -911, end: -609 },
  { name: "Neo-Babylonian empire", start: -626, end: -539 },
  { name: "Persian empire", start: -550, end: -330 },
  { name: "Greek & Hellenistic kingdoms", start: -334, end: -63 },
  { name: "Roman rule in Judea", start: -63, end: 100 },
];
