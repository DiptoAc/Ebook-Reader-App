import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const output = path.join(process.cwd(), 'lib', 'book-content.js');

function readZipEntry(buffer, filename) {
  const signature = 0x02014b50;
  let cursor = 0;
  while (cursor < buffer.length - 46) {
    if (buffer.readUInt32LE(cursor) !== signature) { cursor++; continue; }
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const compression = buffer.readUInt16LE(cursor + 10);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString('utf8');
    if (name === filename) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const data = buffer.subarray(localOffset + 30 + localNameLength + localExtraLength, localOffset + 30 + localNameLength + localExtraLength + compressedSize);
      return compression === 0 ? data : zlib.inflateRawSync(data);
    }
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }
  throw new Error(`Missing ${filename} in DOCX`);
}

function decodeXml(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function paragraphAlignment(body) {
  const alignment = body.match(/<w:jc w:val="(left|right|center|both)"\/>/);
  return alignment?.[1] ?? 'left';
}

function textFromXml(fragment, convertText = (value) => value) {
  const marked = fragment
    .replace(/<w:tab\/>/g, '<w:t>__TAB__</w:t>')
    .replace(/<w:br\/>/g, '<w:t>__SOFT_BREAK__</w:t>');
  const text = decodeXml([...marked.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
    .map((item) => item[1]).join(''))
    .replaceAll('__TAB__', '\t')
    .replaceAll('__SOFT_BREAK__', '\n')
    .trim();
  return text ? convertText(text) : text;
}

function extractWordPages(xml, convertText, ignorePageBreaks = false) {
  const pages = [[]];
  // A reformatted manuscript has its stale Word cache removed; other files
  // still use Word's recorded page boundaries.
  const pageBreakPattern = ignorePageBreaks
    ? /(?!)/g
    : xml.includes('<w:lastRenderedPageBreak/>')
      ? /<w:lastRenderedPageBreak\/>/g
      : /<w:br w:type="page"\/>/g;
  let stanza = [];
  let sourceParagraphIndex = 0;
  const flushStanza = () => {
    if (!stanza.length) return;
    const first = stanza[0];
    pages.at(-1).push({
      text: stanza.map((line) => line.text).join('\n'),
      alignment: first.alignment,
      isTitle: false,
      sourceParagraphIndex: first.sourceParagraphIndex,
    });
    stanza = [];
  };
  for (const match of xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)) {
    const currentParagraphIndex = sourceParagraphIndex++;
    const paragraph = match[1];
    const alignment = paragraphAlignment(paragraph);
    const paragraphIsTitle = /<w:b\b/.test(paragraph);
    const segments = paragraph.split(pageBreakPattern);
    segments.forEach((segment, index) => {
      const text = textFromXml(segment, convertText);
      const isTitle = paragraphIsTitle;
      if (isTitle && text) {
        flushStanza();
        pages.at(-1).push({ text, alignment, isTitle: true, sourceParagraphIndex: currentParagraphIndex });
      } else if (text) {
        stanza.push({ text, alignment, sourceParagraphIndex: currentParagraphIndex });
      } else {
        flushStanza();
      }
      if (index < segments.length - 1) {
        flushStanza();
        pages.push([]);
      }
    });
  }
  flushStanza();
  return pages.filter((blocks) => blocks.some((block) => block.text));
}

const normalizeTitle = (value) => value.replace(/^[০-৯]+\.\s*/, '').replace(/\s+/g, ' ').trim();
const titleAliases = { 'পদছাপ': 'পদচ্ছাপ' };

function docxPages(filename, ignorePageBreaks = false) {
  const xml = readZipEntry(fs.readFileSync(filename), 'word/document.xml').toString('utf8');
  return extractWordPages(xml, undefined, ignorePageBreaks);
}

function splitPagesAtPoemTitles(pages, poemTitles) {
  const titles = new Set(poemTitles.map(normalizeTitle));
  const splitPages = [];
  for (const sourcePage of pages) {
    let currentPage = [];
    for (const block of sourcePage) {
      const [firstLine, ...remainingLines] = block.text.split('\n');
      const isPoemTitle = block.isTitle && titles.has(normalizeTitle(firstLine));
      if (isPoemTitle && currentPage.length) {
        splitPages.push(currentPage);
        currentPage = [];
      }
      if (isPoemTitle) {
        currentPage.push({ ...block, text: firstLine, isTitle: true });
        if (remainingLines.length) currentPage.push({ ...block, text: remainingLines.join('\n'), isTitle: false });
      } else {
        currentPage.push(block);
      }
    }
    if (currentPage.length) splitPages.push(currentPage);
  }
  return splitPages;
}

function wrapDisplayLine(text, maximumCharacters = 30) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > maximumCharacters) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function limitPageLines(pages, maximumLines) {
  const result = [];
  pages.forEach((sourcePage) => {
    let current = [];
    let bodyBlock = null;
    let lineCount = 0;
    const flush = () => {
      if (current.length) result.push(current);
      current = [];
      bodyBlock = null;
      lineCount = 0;
    };
    sourcePage.forEach((block) => {
      const lines = block.text.split('\n').flatMap((line) => wrapDisplayLine(line));
      if (block.isTitle) {
        if (lineCount || lineCount + lines.length > maximumLines) flush();
        current.push({ ...block, isTitle: true });
        lineCount += Math.max(1, lines.length);
        return;
      }
      lines.forEach((line) => {
        if (lineCount === maximumLines) flush();
        if (!bodyBlock) {
          bodyBlock = { ...block, text: '', isTitle: false };
          current.push(bodyBlock);
        }
        bodyBlock.text += bodyBlock.text ? `\n${line}` : line;
        lineCount += 1;
      });
    });
    flush();
  });
  return result;
}

function makeBook({ id, title, source, withContents = false, poemTitles = [], contentsBeforeFirstPoem = false, contentsFromBoldTitles = false, maximumLinesPerPage = 0, poemTitleStartParagraph = 0, repaginatePoems = false }) {
  const rawPages = docxPages(source, repaginatePoems);
  // For books with a curated poem list, front-matter can also be bold. Only
  // the known poem names should become page titles in the reader.
  const knownPoemTitles = new Set(poemTitles.map(normalizeTitle));
  const sourcePages = poemTitles.length
    ? rawPages.map((page) => page.map((block) => ({
      ...block,
      isTitle:
        block.sourceParagraphIndex >= poemTitleStartParagraph &&
        knownPoemTitles.has(normalizeTitle(block.text.split('\n')[0])),
    })))
    : rawPages;
  const detectedPoemTitles = contentsFromBoldTitles
    ? sourcePages
      .flatMap((page) => page.filter((block) => block.isTitle).map((block) => normalizeTitle(block.text)))
      .filter((item, index, all) => item && item !== normalizeTitle(title) && all.indexOf(item) === index)
    : [];
  const effectivePoemTitles = poemTitles.length ? poemTitles : detectedPoemTitles;
  const titleSplitPages = effectivePoemTitles.length ? splitPagesAtPoemTitles(sourcePages, effectivePoemTitles) : sourcePages;
  const pages = maximumLinesPerPage ? limitPageLines(titleSplitPages, maximumLinesPerPage) : titleSplitPages;
  const generatedContents = effectivePoemTitles.length > 0;
  const contentsPage = withContents ? pages.findIndex((blocks) => blocks.some((block) => /^১\./.test(block.text))) : -1;
  const sourceContents = (contentsPage >= 0 ? pages[contentsPage] : [])
    .flatMap((block) => block.text.split('\n'))
    .filter((line) => /^[০-৯]+\./.test(line.trim()))
    .map((label) => {
      const target = titleAliases[normalizeTitle(label)] ?? normalizeTitle(label);
      const page = pages.findIndex((blocks, pageIndex) => pageIndex > contentsPage && blocks.some((block) => normalizeTitle(block.text) === target));
      return { label: label.trim(), page };
    })
    .filter((item) => item.page >= 0);
  const firstPoemPage = generatedContents
    ? pages.findIndex((blocks) => blocks.some((block) => normalizeTitle(block.text) === normalizeTitle(effectivePoemTitles[0])))
    : -1;
  const contents = generatedContents
    ? effectivePoemTitles.map((label) => ({
      label,
      page: pages.findIndex((blocks, pageIndex) => pageIndex >= firstPoemPage && blocks.some((block) => normalizeTitle(block.text) === normalizeTitle(label)))
    })).filter((item) => item.page >= 0)
    : sourceContents;
  const appPages = [...pages];
  let contentsPageIndexes = [];
  let adjustedContents = contents;
  if (generatedContents && contents.length) {
    const generatedContentsPage = contentsBeforeFirstPoem ? Math.max(1, contents[0].page) : Math.min(1, appPages.length);
    const splitContents = contents.length > 10;
    appPages.splice(generatedContentsPage, 0, [{ text: 'সূচিপত্র', alignment: 'center', isTitle: true }]);
    if (splitContents) appPages.splice(generatedContentsPage + 1, 0, [{ text: 'সূচিপত্র (চলমান)', alignment: 'center', isTitle: true, contentsContinuation: true }]);
    contentsPageIndexes = splitContents ? [generatedContentsPage, generatedContentsPage + 1] : [generatedContentsPage];
    adjustedContents = contents.map((item) => ({ ...item, page: item.page >= generatedContentsPage ? item.page + (splitContents ? 2 : 1) : item.page }));
  } else if (contents.length) {
    contentsPageIndexes = [contentsPage, contentsPage + 1];
    appPages.splice(contentsPage + 1, 0, [{ text: 'সূচিপত্র (চলমান)', alignment: 'center', isTitle: true, contentsContinuation: true }]);
    adjustedContents = contents.map((item) => ({ ...item, page: item.page > contentsPage ? item.page + 1 : item.page }));
  }
  return {
    id,
    title,
    author: 'প্রণব আচার্য্য',
    pages: appPages.length ? appPages : [[{ text: 'এই বইটির পাঠ্য প্রস্তুত করা হচ্ছে।', alignment: 'left', isTitle: false }]],
    contents: adjustedContents,
    contentsPageIndexes
  };
}

const unicodeFolder = path.join(process.cwd(), 'manuscripts', 'Unicode');
const books = [
  makeBook({ id: 'sonali-dobar', title: 'সোনালি ডোবার শহর বিজয়', source: path.join(unicodeFolder, 'সোনালি-ডোবার-শহর-বিজয় (Unicode).docx'), withContents: true }),
  makeBook({
    id: 'anubad-kobita', title: 'অনুবাদ কবিতা', source: path.join(unicodeFolder, 'অনুবাদ কবিতা (Unicode).docx'),
    poemTitles: ['কর্তিত শস্যের গান', 'একটি বিলম্বিত প্রস্থান', 'তুষার সন্ধ্যায় আরণ্যিক অবকাশে']
  }),
  makeBook({
    id: 'koyekti-bhera', title: 'কয়েকটি ভেড়া ও একটি মানুষ', source: path.join(unicodeFolder, 'কয়েকটি ভেড়া ও একটি মানুষ (Unicode).docx'),
    contentsBeforeFirstPoem: true,
    // Keep one line of visual headroom for responsive type sizing while
    // guaranteeing that the rendered page never exceeds 22 lines.
    maximumLinesPerPage: 21,
    poemTitleStartParagraph: 35,
    repaginatePoems: true,
    poemTitles: [
      'তুমি আমায় ডেকেছ', 'জীবনের এই সাধ, সুপক্ব যবের ঘ্রাণ', 'রায়ট', 'সবুজ পায়রা', 'রথযাত্রা',
      'নতুন গান', 'লোকটির ব্যক্তি হয়ে ওঠা', 'একটি সংক্ষিপ্ত কেস স্টাডি', 'পা', 'সরল দোলক',
      'রাজারানির গল্প', 'কয়েকটি ভেড়া ও একটি মানুষ', 'সাইকেল অথবা শৈশব', 'বাঁশিওলা', 'মহাপ্রস্থান',
      'দ্বিধার নদীতে ভেসে উঠছি কয়েকটি কৃষ্ণশশী', 'গলির সিংহাসন থেকে উৎসারিত সংলাপেরা',
      'সরস্বতী', 'বিষণ্ন সৌরলোকে', 'রোদন ও অন্যান্য'
    ]
  }),
  makeBook({
    id: 'prem-o-onnyanno',
    title: 'প্রেম ও অন্যান্য কবিতা',
    source: path.join(unicodeFolder, 'প্রেম ও অন্যান্য কবিতা (Unicode).docx'),
    contentsFromBoldTitles: true
  })
];
fs.writeFileSync(output, `// Generated from the supplied manuscripts. Do not edit manually.\nexport const books = ${JSON.stringify(books, null, 2)};\nexport const book = books[0];\n`);
console.log(`Prepared ${books.map((item) => `${item.pages.length} pages: ${item.title}`).join('; ')}.`);
