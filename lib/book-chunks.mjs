export function normal(value = "") {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[।,;:!?“”‘’"'()[\]{}—–…॥/\\-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function isContentsBlock(block) {
  const text = normal(block.text);
  return text === "সূচিপত্র" || text.includes("সূচিপত্র চলমান") || /^১\s*[.।]/u.test(text);
}

export function makeLibraryChunks(books, excerptLength = 1000) {
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
        id: `${book.id}:${pageIndex}`,
        kind: "book",
        bookId: book.id,
        bookTitle: book.title,
        sectionTitle: activeTitle,
        page: pageIndex,
        text: text.slice(0, excerptLength),
        searchable: normal(`${book.title} ${activeTitle} ${text}`),
      });
    });
  });
  return chunks;
}
