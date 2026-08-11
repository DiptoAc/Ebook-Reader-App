import fs from 'node:fs';
import path from 'node:path';

const workDir = process.argv[2];
if (!workDir) throw new Error('Provide the extracted DOCX working directory.');

const poemTitles = [
  'তুমি আমায় ডেকেছ',
  'জীবনের এই সাধ, সুপক্ব যবের ঘ্রাণ',
  'রায়ট',
  'সবুজ পায়রা',
  'রথযাত্রা',
  'নতুন গান',
  'লোকটির ব্যক্তি হয়ে ওঠা',
  'একটি সংক্ষিপ্ত কেস স্টাডি',
  'পা',
  'সরল দোলক',
  'রাজারানির গল্প',
  'কয়েকটি ভেড়া ও একটি মানুষ',
  'সাইকেল অথবা শৈশব',
  'বাঁশিওলা',
  'মহাপ্রস্থান',
  'দ্বিধার নদীতে ভেসে উঠছি কয়েকটি কৃষ্ণশশী',
  'গলির সিংহাসন থেকে উৎসারিত সংলাপেরা',
  'সরস্বতী',
  'বিষণ্ন সৌরলোকে',
  'রোদন ও অন্যান্য'
];

const decodeXml = (value) => value
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const titles = new Set(poemTitles.map(normalize));
const documentPath = path.join(workDir, 'word', 'document.xml');
let xml = fs.readFileSync(documentPath, 'utf8');
let formattedTitles = 0;
let paragraphIndex = 0;

xml = xml.replace(/(<w:p(?:\s[^>]*)?>)([\s\S]*?)(<\/w:p>)/g, (paragraph, open, body, close) => {
  const currentParagraph = paragraphIndex++;
  const text = normalize(decodeXml([...body.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]).join('')));
  if (currentParagraph < 219 || !titles.has(text)) return paragraph;
  formattedTitles++;
  let titleBody = body.replace(/(<w:r(?:\s[^>]*)?>)([\s\S]*?)(<\/w:r>)/, (_run, runOpen, runBody, runClose) => {
    const withProperties = runBody.includes('<w:rPr>')
      ? runBody.replace('<w:rPr>', '<w:rPr><w:b/><w:bCs/>')
      : `<w:rPr><w:b/><w:bCs/></w:rPr>${runBody}`;
    return `${runOpen}${withProperties}${runClose}`;
  });
  titleBody = titleBody.replace(/(<w:r(?:\s[^>]*)?>)(<w:rPr>[\s\S]*?<\/w:rPr>)?/, (_run, runOpen, properties = '') => `${runOpen}${properties}<w:br w:type="page"/>`);
  return `${open}${titleBody}${close}`;
});

if (formattedTitles !== poemTitles.length) {
  throw new Error(`Formatted ${formattedTitles} poem titles; expected ${poemTitles.length}.`);
}
fs.writeFileSync(documentPath, xml, 'utf8');
console.log(`Formatted ${formattedTitles} poem titles with page starts.`);
