function cleanMarkdown(value) {
  return value
    .replace(/^#{1,6}\s+/gmu, "")
    .replace(/[*_`]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

export function makeManualChunks(markdown, maxLength = 1000) {
  const sections = markdown.split(/^##\s+/mu).slice(1);
  const chunks = [];
  sections.forEach((section, sectionIndex) => {
    const [rawTitle = "ব্যবহার নির্দেশিকা", ...body] = section.split(/\r?\n/u);
    const title = cleanMarkdown(rawTitle);
    const paragraphs = body.join("\n").split(/\n{2,}/u).map(cleanMarkdown).filter(Boolean);
    let current = "";
    const addChunk = () => {
      if (!current) return;
      chunks.push({
        id: `app-guide:${chunks.length}`,
        kind: "manual",
        bookId: "app-guide",
        bookTitle: "অ্যাপ ব্যবহার নির্দেশিকা",
        sectionTitle: title,
        page: sectionIndex,
        text: current,
      });
      current = "";
    };
    paragraphs.forEach((paragraph) => {
      const next = current ? `${current}\n\n${paragraph}` : paragraph;
      if (next.length > maxLength && current) addChunk();
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    });
    addChunk();
  });
  return chunks;
}
