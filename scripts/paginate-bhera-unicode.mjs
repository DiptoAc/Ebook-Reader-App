import fs from 'node:fs';
import path from 'node:path';

const workDir = process.argv[2];
if (!workDir) throw new Error('Provide the extracted DOCX working directory.');

const MAX_LINES = 22;
const CHARACTERS_PER_LINE = 30;
const poemTitles = new Set([
  'তুমি আমায় ডেকেছ', 'জীবনের এই সাধ, সুপক্ব যবের ঘ্রাণ', 'রায়ট', 'সবুজ পায়রা', 'রথযাত্রা',
  'নতুন গান', 'লোকটির ব্যক্তি হয়ে ওঠা', 'একটি সংক্ষিপ্ত কেস স্টাডি', 'পা', 'সরল দোলক',
  'রাজারানির গল্প', 'কয়েকটি ভেড়া ও একটি মানুষ', 'সাইকেল অথবা শৈশব', 'বাঁশিওলা', 'মহাপ্রস্থান',
  'দ্বিধার নদীতে ভেসে উঠছি কয়েকটি কৃষ্ণশশী', 'গলির সিংহাসন থেকে উৎসারিত সংলাপেরা',
  'সরস্বতী', 'বিষণ্ন সৌরলোকে', 'রোদন ও অন্যান্য',
]);

const decodeXml = (value) => value
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const encodeXml = (value) => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const normalize = (value) => value.replace(/\s+/g, ' ').trim();

function paragraphText(body) {
  return decodeXml(
    body
      .replace(/<w:br\s*\/>/g, '\n')
      .replace(/<w:br w:type="page"\s*\/>/g, '\n')
      .match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)?.map((run) =>
        run.replace(/^<w:t(?:\s[^>]*)?>|<\/w:t>$/g, ''),
      ).join('') ?? '',
  );
}

function wrapLines(text) {
  return text.split(/\n/).flatMap((sourceLine) => {
    const words = sourceLine.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (line && next.length > CHARACTERS_PER_LINE) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    return lines;
  });
}

function pageBreakBefore(body) {
  return body.replace(/(<w:r(?:\s[^>]*)?>)([\s\S]*?<\/w:r>)/, (_run, open, run) => {
    const properties = run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? '';
    return `${open}${properties}<w:br w:type="page"/>${run.replace(properties, '')}`;
  });
}

function rebuildLongParagraph(body, lines, firstLineCapacity) {
  const paragraphProperties = body.match(/^(<w:pPr>[\s\S]*?<\/w:pPr>)/)?.[0] ?? '';
  const runProperties = body.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? '';
  const runs = [];
  let lineOnPage = firstLineCapacity;
  lines.forEach((line, index) => {
    if (lineOnPage === MAX_LINES) {
      runs.push(`<w:r>${runProperties}<w:br w:type="page"/></w:r>`);
      lineOnPage = 0;
    }
    if (index > 0 && lineOnPage > 0) runs.push(`<w:r>${runProperties}<w:br/></w:r>`);
    runs.push(`<w:r>${runProperties}<w:t xml:space="preserve">${encodeXml(line)}</w:t></w:r>`);
    lineOnPage += 1;
  });
  return { body: `${paragraphProperties}${runs.join('')}`, finalLineCount: lineOnPage };
}

const documentPath = path.join(workDir, 'word', 'document.xml');
let xml = fs.readFileSync(documentPath, 'utf8');
let pageLines = 0;
let paragraphIndex = 0;
let forcedPoemStarts = 0;
let generatedPageBreaks = 0;

xml = xml.replace(/(<w:p(?:\s[^>]*)?>)([\s\S]*?)(<\/w:p>)/g, (_paragraph, open, body, close) => {
  const index = paragraphIndex++;
  // Discard Word's cached page markers and any earlier pagination. This pass
  // becomes the single source of truth for page boundaries.
  body = body
    .replace(/<w:lastRenderedPageBreak\/>/g, '')
    .replace(/<w:br w:type="page"\s*\/>/g, '');
  const text = paragraphText(body);
  const normalText = normalize(text);
  const isPoemTitle = index >= 219 && poemTitles.has(normalText);
  if (!normalText) return `${open}${body}${close}`;

  const lines = wrapLines(text);
  if (isPoemTitle && pageLines > 0) {
    body = pageBreakBefore(body);
    pageLines = 0;
    forcedPoemStarts += 1;
    generatedPageBreaks += 1;
  }
  if (!isPoemTitle && pageLines > 0 && pageLines + lines.length > MAX_LINES) {
    body = pageBreakBefore(body);
    pageLines = 0;
    generatedPageBreaks += 1;
  }

  if (lines.length > MAX_LINES - pageLines) {
    const rebuilt = rebuildLongParagraph(body, lines, pageLines);
    generatedPageBreaks += Math.floor((pageLines + lines.length - 1) / MAX_LINES);
    pageLines = rebuilt.finalLineCount;
    return `${open}${rebuilt.body}${close}`;
  }

  pageLines += lines.length;
  return `${open}${body}${close}`;
});

fs.writeFileSync(documentPath, xml, 'utf8');
console.log(`Inserted ${generatedPageBreaks} page breaks; enforced ${forcedPoemStarts} poem starts; maximum is ${MAX_LINES} wrapped lines per page.`);
