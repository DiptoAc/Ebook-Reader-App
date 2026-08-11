import fs from 'node:fs';
import path from 'node:path';
import ansiConverter from '@abdalgolabs/ansi-unicode-converter/dist/core.js';

const workDir = process.argv[2];
if (!workDir) throw new Error('Provide the extracted DOCX working directory.');

const decodeXml = (value) => value
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const encodeXml = (value) => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(item);
    else if (entry.name.endsWith('.xml')) convertXml(item);
  }
}

function convertXml(file) {
  let xml = fs.readFileSync(file, 'utf8');
  if (file.includes(`${path.sep}word${path.sep}`)) {
    // Word frequently splits a visible word into several <w:t> runs. Bijoy
    // vowel signs may therefore sit in a different run from their consonant.
    // Convert each original *page segment* of a paragraph at once, keeping its
    // paragraph properties and placing the Unicode text in that segment's
    // first text run. This respects the original rendered page boundaries.
    xml = xml.replace(/(<w:p(?:\s[^>]*)?>)([\s\S]*?)(<\/w:p>)/g, (_paragraph, openParagraph, body, closeParagraph) => {
      const paragraphUsesSutonny = /<w:pPr>[\s\S]*?SutonnyMJ[\s\S]*?<\/w:pPr>/.test(body);
      const segments = body.split(/(<w:lastRenderedPageBreak\/>)/g);
      const convertedBody = segments.map((segment) => {
        if (segment === '<w:lastRenderedPageBreak/>') return '<w:br w:type="page"/>';
        const runs = [...segment.matchAll(/(<w:r(?:\s[^>]*)?>)([\s\S]*?)(<\/w:r>)/g)];
        if (!runs.length) return segment;
        const convertedRuns = [];
        let pending = [];
        const flushPending = () => {
          if (!pending.length) return;
          const converted = encodeXml(ansiConverter.convertMixedToUnicode(pending.map((item) => item.text).join('')).replaceAll('¯', 'স্'));
          pending.forEach((item, index) => {
            let inserted = false;
            convertedRuns.push(item.run.replace(/(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g, (_textRun, openText, _text, closeText) => {
              if (index === 0 && !inserted) { inserted = true; return `${openText}${converted}${closeText}`; }
              return `${openText}${closeText}`;
            }));
          });
          pending = [];
        };
        for (const run of runs) {
          const fullRun = `${run[1]}${run[2]}${run[3]}`;
          const hasExplicitFont = /<w:rFonts\b/.test(fullRun);
          const isSutonnyRun = /SutonnyMJ/.test(fullRun) || (!hasExplicitFont && paragraphUsesSutonny);
          const text = [...run[2].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((item) => decodeXml(item[1])).join('');
          if (isSutonnyRun && text) pending.push({ run: fullRun, text });
          else { flushPending(); convertedRuns.push(fullRun); }
        }
        flushPending();
        return convertedRuns.join('');
      }).join('');
      return `${openParagraph}${convertedBody}${closeParagraph}`;
    });
  }
  // Convert only the legacy font declarations; all paragraph, page, header,
  // table, image, numbering and section markup remains untouched.
  xml = xml.replace(/SutonnyMJ/gi, 'Nirmala UI');
  fs.writeFileSync(file, xml, 'utf8');
}

visit(workDir);
