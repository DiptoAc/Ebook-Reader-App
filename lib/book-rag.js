import { books } from "./book-content";

const TOPIC_TERMS = {
  রোমান্টিক: ["প্রেম", "ভালোবাস", "ভালবাস", "চুম্বন", "প্রণয়", "প্রণয়ের", "বিরহ", "তুমি", "হৃদয়"],
  প্রেম: ["ভালোবাস", "ভালবাস", "চুম্বন", "প্রণয়", "বিরহ", "তুমি"],
  ভালোবাসা: ["প্রেম", "ভালবাস", "চুম্বন", "প্রণয়", "বিরহ"],
  বিরহ: ["প্রেম", "ভালোবাস", "ভালবাস", "একাক", "নিঃসঙ্গ", "অপেক্ষা", "বিদায়"],
  শৈশব: ["শৈশব", "শিশু", "ছেলেবেলা", "কৈশোর", "খেল", "স্কুল"],
  প্রকৃতি: ["বৃষ্টি", "নদী", "আকাশ", "গাছ", "পাখি", "ফুল", "মাটি", "রোদ"],
  মৃত্যু: ["মৃত্যু", "শেষ", "বিদায়", "প্রস্থান", "শোক", "অন্ধকার"],
  শহর: ["শহর", "ঢাকা", "রাস্তা", "গলি", "বাজার", "বাড়ি"],
};

function normal(value = "") {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[।,;:!?“”‘’"'()[\]{}—–…॥/\\-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function termsForQuestion(question) {
  const base = normal(question).split(" ").filter((word) => word.length > 1);
  const expanded = [...base];
  Object.entries(TOPIC_TERMS).forEach(([topic, terms]) => {
    if (normal(question).includes(topic)) expanded.push(...terms);
  });
  return [...new Set(expanded)];
}

function isContentsBlock(block) {
  const text = normal(block.text);
  return text === "সূচিপত্র" || text.includes("সূচিপত্র চলমান") || /^১\s*[.।]/u.test(text);
}

function makeChunks() {
  const chunks = [];
  books.forEach((book) => {
    let activeTitle = book.title;
    book.pages.forEach((page, pageIndex) => {
      const pageText = [];
      page.forEach((block) => {
        if (block.isTitle && !block.contentsContinuation && !isContentsBlock(block)) {
          activeTitle = block.text.replace(/\s+/gu, " ").trim() || activeTitle;
        }
        if (!isContentsBlock(block) && block.text?.trim()) pageText.push(block.text.trim());
      });
      const text = pageText.join("\n").trim();
      if (!text || isContentsBlock(page[0] ?? {})) return;
      chunks.push({
        bookId: book.id,
        bookTitle: book.title,
        sectionTitle: activeTitle,
        page: pageIndex,
        text: text.slice(0, 1000),
        searchable: normal(`${book.title} ${activeTitle} ${text}`),
      });
    });
  });
  return chunks;
}

const libraryChunks = makeChunks();

export function retrieveLibraryContext(question, limit = 4) {
  const terms = termsForQuestion(question);
  const query = normal(question);
  const scored = libraryChunks
    .map((chunk) => {
      let score = 0;
      terms.forEach((term) => {
        if (chunk.searchable.includes(term)) score += 2;
        if (normal(chunk.sectionTitle).includes(term)) score += 8;
        if (normal(chunk.bookTitle).includes(term)) score += 7;
      });
      if (query && chunk.searchable.includes(query)) score += 16;
      return { ...chunk, score };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score || a.page - b.page);

  const seen = new Set();
  return scored.filter((chunk) => {
    const key = `${chunk.bookId}-${chunk.sectionTitle}-${chunk.page}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit).map(({ searchable, score, ...chunk }) => chunk);
}
