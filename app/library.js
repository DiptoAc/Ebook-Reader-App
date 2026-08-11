'use client';

import { useEffect, useState } from 'react';
import { books, book as defaultBook } from '../lib/book-content';

const libraryBooks = [
  { title: 'সূর্যের একচ্ছত্র অধিকার অস্তের পূর্বে', cover: 'প্রচ্ছদ - সূর্যের একচ্ছত্র অধিকার অস্তের পূর্বে.jpeg' },
  { title: 'শোকার্ত আলোর নিচে', cover: 'প্রচ্ছদ - শোকার্ত আলোর নীচে.jpeg' },
  { id: 'prem-o-onnyanno', title: 'প্রেম ও অন্যান্য কবিতা', cover: 'প্রচ্ছদ - প্রেম ও অন্যান্য কবিতা।.jpeg', readable: true },
  { id: 'anubad-kobita', title: 'অনুবাদ কবিতা', cover: 'প্রচ্ছদ - অনুবাদ কবিতা।.jpeg', readable: true },
  { id: 'koyekti-bhera', title: 'কয়েকটি ভেড়া ও একটি মানুষ', cover: 'প্রচ্ছদ - কয়েকটি ভেড়া ও একটি মানুষ.png', readable: true },
  { id: 'sonali-dobar', title: 'সোনালি ডোবার শহরে', cover: 'প্রচ্ছদ - সোনালি ডোবার শহরে.jpeg', readable: true },
];
const frontPageDesigns = [
  { id: 'bookcase', label: 'বহুতল বইয়ের তাক', description: 'গাছপালা ও সাজসজ্জাসহ কাঠের বুককেস' },
  { id: 'classic', label: 'এক সারির তাক', description: 'পরিচ্ছন্ন, আগের নকশার একক তাক' },
  { id: 'zigzag', label: 'জিগজ্যাগ তাক', description: 'সাদা ঘরে আধুনিক কাঠের জিগজ্যাগ বুকশেলফ' },
  { id: 'circular', label: 'বইয়ের ক্যারোসেল', description: 'স্ক্রল করে ঘুরিয়ে বই দেখার চলমান তাক' },
];

function Plant({ small = false }) {
  return <div className={`shelf-plant${small ? ' small-plant' : ''}`} aria-hidden="true">
    <span className="plant-leaf leaf-one" /><span className="plant-leaf leaf-two" /><span className="plant-leaf leaf-three" /><span className="plant-pot" />
  </div>;
}

function FutureBookSlot({ className = '', style }) {
  return <div className={`future-book-slot ${className}`} style={style} aria-label="নতুন বইয়ের জন্য খালি স্থান"><span>নতুন বই</span></div>;
}

function DisplayBook({ entry, className = '', style, onOpen, savedPage }) {
  const content = <span className="cover-book"><img src={encodeURI(`/sequence/covers/${entry.cover}`)} alt={entry.title} /><span className="cover-book-title">{entry.title}</span></span>;
  return entry.readable ? <button className={`library-cover featured-book ${className}`} style={style} onClick={() => onOpen(entry.id)} aria-label={`${entry.title} খুলুন`}>{content}{savedPage > 0 && <span className="resume">পৃষ্ঠা {savedPage + 1} থেকে</span>}</button> : <div className={`library-cover ${className}`} style={style} aria-label={entry.title}>{content}</div>;
}

function wrapQuoteLines(context, text, maxWidth) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

export default function Library() {
  const [isReading, setIsReading] = useState(false);
  const [activeBookId, setActiveBookId] = useState(defaultBook.id);
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState('next');
  const [savedPage, setSavedPage] = useState(0);
  const [frontPageDesign, setFrontPageDesign] = useState('circular');
  const [showSettings, setShowSettings] = useState(false);
  const [carouselRotation, setCarouselRotation] = useState(0);
  const [selectionMenu, setSelectionMenu] = useState(null);
  const [shareStatus, setShareStatus] = useState('');
  const activeBook = books.find((item) => item.id === activeBookId) ?? defaultBook;
  const usesWordRenderedPages = activeBook.id === 'prem-o-onnyanno';
  const readerPageCount = usesWordRenderedPages ? 48 : activeBook.pages.length;
  const detectedContentsPage = Math.max(0, activeBook.pages.findIndex((blocks) => blocks.some((block) => /^১\./.test(block.text))));
  const contentsPageIndexes = activeBook.contentsPageIndexes ?? [detectedContentsPage];
  const contentsPage = contentsPageIndexes[0] ?? detectedContentsPage;

  useEffect(() => {
    setSavedPage(Number(localStorage.getItem(`bookmark-${activeBook.id}`)) || 0);
    setFrontPageDesign(localStorage.getItem('front-page-design') || 'circular');
  }, [activeBook.id]);

  function chooseFrontPageDesign(design) {
    setFrontPageDesign(design);
    localStorage.setItem('front-page-design', design);
    setShowSettings(false);
  }

  function rotateCarousel(event) {
    event.preventDefault();
    setCarouselRotation((rotation) => rotation + (event.deltaY > 0 ? 18 : -18));
  }

  function captureSelection() {
    window.setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().replace(/\s+/g, ' ').trim();
      if (!text || !selection?.rangeCount) return setSelectionMenu(null);
      const range = selection.getRangeAt(0);
      const selectionNode = range.commonAncestorContainer.nodeType === Node.TEXT_NODE ? range.commonAncestorContainer.parentElement : range.commonAncestorContainer;
      const pageCopy = selectionNode.closest?.('.page-copy');
      if (!pageCopy) return setSelectionMenu(null);
      const rect = range.getBoundingClientRect();
      setSelectionMenu({ text, left: Math.min(Math.max(rect.left + rect.width / 2, 94), window.innerWidth - 94), top: Math.max(rect.top - 10, 64) });
    }, 0);
  }

  function clearSelectionMenu() {
    window.getSelection()?.removeAllRanges();
    setSelectionMenu(null);
  }

  async function copyQuote() {
    try {
      await navigator.clipboard.writeText(selectionMenu.text);
      setShareStatus('উদ্ধৃতিটি কপি করা হয়েছে');
    } catch {
      setShareStatus('কপি করা যায়নি');
    }
    window.setTimeout(() => setShareStatus(''), 2200);
    clearSelectionMenu();
  }

  async function shareQuote() {
    const quote = selectionMenu.text.length > 500 ? `${selectionMenu.text.slice(0, 497)}...` : selectionMenu.text;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext('2d');
    const background = context.createLinearGradient(0, 0, 1080, 1350);
    background.addColorStop(0, '#3b1609'); background.addColorStop(.55, '#7b351b'); background.addColorStop(1, '#1e0b05');
    context.fillStyle = background; context.fillRect(0, 0, 1080, 1350);
    context.strokeStyle = '#d8ad5a'; context.lineWidth = 5; context.strokeRect(50, 50, 980, 1250);
    context.strokeStyle = 'rgba(255,231,172,.35)'; context.lineWidth = 1; context.strokeRect(70, 70, 940, 1210);
    context.fillStyle = '#e4bd70'; context.font = '600 31px "Noto Serif Bengali", serif'; context.textAlign = 'center'; context.fillText(activeBook.title, 540, 155);
    context.fillStyle = '#f6e4be'; context.font = '82px Georgia, serif'; context.fillText('“', 540, 295);
    context.fillStyle = '#fff5dd'; context.font = '600 51px "Noto Serif Bengali", serif';
    const lines = wrapQuoteLines(context, quote, 830); const lineHeight = 80; const startY = 375 - Math.max(0, (lines.length - 7) * 15);
    lines.slice(0, 11).forEach((line, index) => context.fillText(line, 540, startY + index * lineHeight));
    context.fillStyle = '#f6e4be'; context.font = '82px Georgia, serif'; context.fillText('”', 540, Math.min(1100, startY + lines.slice(0, 11).length * lineHeight + 38));
    context.fillStyle = '#e4bd70'; context.font = '500 34px "Noto Serif Bengali", serif'; context.fillText(`— ${activeBook.author}`, 540, 1180);
    context.fillStyle = 'rgba(255,232,181,.62)'; context.font = '400 25px "Noto Serif Bengali", serif'; context.fillText(activeBook.title, 540, 1230);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const file = new File([blob], `${activeBook.id}-quote.png`, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: activeBook.title, text: `— ${activeBook.author}` });
      else if (navigator.share) await navigator.share({ title: activeBook.title, text: `${quote}\n— ${activeBook.author}` });
      else {
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = file.name; link.click(); URL.revokeObjectURL(link.href);
        setShareStatus('কোট কার্ডটি ডাউনলোড করা হয়েছে');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setShareStatus('শেয়ার করা যায়নি');
    }
    window.setTimeout(() => setShareStatus(''), 2200);
    clearSelectionMenu();
  }

  function openBook(bookId = defaultBook.id) {
    const selectedBook = books.find((item) => item.id === bookId) ?? defaultBook;
    setActiveBookId(selectedBook.id);
    setSavedPage(Number(localStorage.getItem(`bookmark-${selectedBook.id}`)) || 0);
    setPage(0);
    setIsReading(true);
  }

  function move(nextPage) {
    if (nextPage < 0 || nextPage >= readerPageCount) return;
    setDirection(nextPage > page ? 'next' : 'previous');
    setPage(nextPage);
  }

  function closeBook() {
    localStorage.setItem(`bookmark-${activeBook.id}`, String(page));
    setSavedPage(page);
    setIsReading(false);
  }

  if (isReading) {
    return <main className="reader-shell">
      <div className="reader-topbar">
        <button className="back-button" onClick={closeBook} aria-label="পাঠাগারে ফিরুন">← <span>পাঠাগার</span></button>
        <div className="reader-jumps">
          <button onClick={() => move(0)} disabled={page === 0}>প্রথম পাতা</button>
          <button onClick={() => move(contentsPage)} disabled={page === contentsPage}>সূচিপত্র</button>
        </div>
      </div>
      {selectionMenu && <div className="selection-toolbar" style={{ left: selectionMenu.left, top: selectionMenu.top }} onMouseDown={(event) => event.preventDefault()}><button onClick={copyQuote}>কপি</button><button className="share-quote-button" onClick={shareQuote}>শেয়ার</button></div>}
      {shareStatus && <div className="share-status" role="status">{shareStatus}</div>}
      <section className="open-book" aria-label={`${activeBook.title} পড়া হচ্ছে`}>
        <div className="bookmark">চিহ্নিত</div>
        <article key={page} className={`paper-page ${direction}${!usesWordRenderedPages && activeBook.pages[page].length > 25 ? ' dense-page' : ''}${usesWordRenderedPages ? ' rendered-doc-page' : ''}`}>
          {!usesWordRenderedPages && <div className="page-head"><span>{activeBook.title}</span><span>{page + 1}</span></div>}
          {usesWordRenderedPages ? <img className="rendered-doc-image" src={`/rendered-books/prem-o-onnyanno/page-${String(page + 1).padStart(2, '0')}.png`} alt={`${activeBook.title}, পৃষ্ঠা ${page + 1}`} /> : contentsPageIndexes.includes(page) && activeBook.contents?.length ? <nav className="contents-list" aria-label="কবিতার সূচিপত্র">
            <h2>{page === contentsPageIndexes[0] ? 'সূচিপত্র' : 'সূচিপত্র (চলমান)'}</h2>
            {activeBook.contents.slice(
              contentsPageIndexes.length > 1 && page === contentsPageIndexes[0] ? 0 : contentsPageIndexes.length > 1 ? Math.ceil(activeBook.contents.length / 2) : 0,
              contentsPageIndexes.length > 1 && page === contentsPageIndexes[0] ? Math.ceil(activeBook.contents.length / 2) : undefined
            ).map((item) => <button key={item.label} onClick={() => move(item.page)}><span>{item.label}</span><span>পৃষ্ঠা {item.page + 1} →</span></button>)}
          </nav> : <div className="page-copy" onMouseUp={captureSelection} onTouchEnd={captureSelection}>{activeBook.pages[page].map((block, index) => <p key={index} className={`document-block align-${block.alignment}${block.spacer ? ' document-spacer' : ''}${block.isTitle ? ' poem-title' : ''}`}>{block.text}</p>)}</div>}
          {!usesWordRenderedPages && <div className="page-number">পৃষ্ঠা {page + 1} / {readerPageCount}</div>}
          <button className="page-curl page-curl-previous" onClick={() => move(page - 1)} disabled={page === 0} aria-label="আগের পাতায় যান">
            <span className="curl-under" aria-hidden="true" />
            <span className="curl-shadow" aria-hidden="true" />
            <span className="curl-fold" aria-hidden="true"><span className="curl-sheen" /></span>
          </button>
          <button className="page-curl page-curl-next" onClick={() => move(page + 1)} disabled={page === readerPageCount - 1} aria-label="পরের পাতায় যান">
            <span className="curl-under" aria-hidden="true" />
            <span className="curl-shadow" aria-hidden="true" />
            <span className="curl-fold" aria-hidden="true"><span className="curl-sheen" /></span>
          </button>
        </article>
      </section>
    </main>;
  }

  return <main className={`library-shell front-design-${frontPageDesign}`}>
    <header className="library-header"><p>আমার ব্যক্তিগত সংগ্রহ</p><h1>পাঠশালা</h1><span>একটি বই বেছে নিয়ে পড়া শুরু করুন</span></header>
    <button className="settings-button" onClick={() => setShowSettings(true)} aria-label="প্রথম পাতার নকশা বদলান">⚙ <span>সাজসজ্জা</span></button>
    {showSettings && <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="প্রথম পাতার নকশা">
      <div className="settings-panel"><button className="settings-close" onClick={() => setShowSettings(false)} aria-label="বন্ধ করুন">×</button><h2>প্রথম পাতার নকশা</h2><p>আপনার পছন্দের পাঠাগারটি বেছে নিন</p>
        <div className="design-choices">{frontPageDesigns.map((design) => <button key={design.id} className={frontPageDesign === design.id ? 'selected' : ''} onClick={() => chooseFrontPageDesign(design.id)}><strong>{design.label}</strong><span>{design.description}</span></button>)}</div>
      </div>
    </div>}
    {frontPageDesign === 'classic' ? <section className="classic-shelf" aria-label="বইয়ের তাক">{libraryBooks.map((entry) => <DisplayBook key={entry.title} entry={entry} onOpen={openBook} savedPage={savedPage} />)}<FutureBookSlot /><FutureBookSlot /></section> : frontPageDesign === 'circular' ? <section className="circular-room" aria-label="বইয়ের ক্যারোসেল"><p>বইয়ের তাক ঘোরাতে স্ক্রল করুন</p><div className="circular-shelf" onWheel={rotateCarousel} role="region" aria-label="স্ক্রল করে বইয়ের ক্যারোসেল ঘোরান">
      <div className="circular-ring" aria-hidden="true" />
      {[...libraryBooks, null, null].map((entry, index, entries) => { const angle = (carouselRotation + index * (360 / entries.length)) * (Math.PI / 180); const depth = (Math.cos(angle) + 1) / 2; const visible = depth > .54; const x = Math.sin(angle) * 335; const y = 68 - depth * 102; const scale = .38 + depth * .62; const tilt = -Math.sin(angle) * 42; const style = { transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale}) rotateY(${tilt}deg)`, zIndex: Math.round(depth * 100), opacity: visible ? .32 + depth * .68 : 0, pointerEvents: visible ? 'auto' : 'none' }; return entry ? <DisplayBook key={entry.title} entry={entry} className="carousel-slot" style={style} onOpen={openBook} savedPage={savedPage} /> : <FutureBookSlot key={`future-${index}`} className="carousel-slot" style={style} />; })}
      <div className="carousel-hub" aria-hidden="true">পাঠশালা</div>
    </div></section> : frontPageDesign === 'zigzag' ? <section className="zigzag-room" aria-label="জিগজ্যাগ বইয়ের তাক"><div className="zigzag-shelf">
      <div className="zigzag-level"><DisplayBook entry={libraryBooks[0]} className="zigzag-book" /></div>
      <div className="zigzag-level reverse"><DisplayBook entry={libraryBooks[1]} className="zigzag-book" /></div>
      <div className="zigzag-level"><DisplayBook entry={libraryBooks[2]} className="zigzag-book" onOpen={openBook} savedPage={savedPage} /><DisplayBook entry={libraryBooks[5]} className="zigzag-book" onOpen={openBook} savedPage={savedPage} /></div>
      <div className="zigzag-level reverse"><DisplayBook entry={libraryBooks[3]} className="zigzag-book" onOpen={openBook} savedPage={savedPage} /><DisplayBook entry={libraryBooks[4]} className="zigzag-book" onOpen={openBook} savedPage={savedPage} /></div>
      <div className="zigzag-level"><FutureBookSlot className="zigzag-empty" /><FutureBookSlot className="zigzag-empty" /></div>
    </div></section> : <section className="shelf-viewport" aria-label="বইয়ের তাক">
      <div className="bookcase">
        <img className="bookcase-photo" src={encodeURI('/Eight book shelf books added.png')} alt="ছয়টি বই ও দুটি খালি স্থানসহ কাঠের বইয়ের তাক" />
        <button className="photo-book-hitbox photo-book-anubad" onClick={() => openBook('anubad-kobita')} aria-label={`${libraryBooks[3].title} খুলুন`}><span className="sr-only">{libraryBooks[3].title} খুলুন</span></button>
        <button className="photo-book-hitbox photo-book-bhera" onClick={() => openBook('koyekti-bhera')} aria-label={`${libraryBooks[4].title} খুলুন`}><span className="sr-only">{libraryBooks[4].title} খুলুন</span></button>
        <button className="photo-book-hitbox photo-book-prem" onClick={() => openBook('prem-o-onnyanno')} aria-label={`${libraryBooks[2].title} খুলুন`}><span className="sr-only">{libraryBooks[2].title} খুলুন</span></button>
        <button className="photo-book-hitbox photo-book-sonali" onClick={() => openBook('sonali-dobar')} aria-label={`${libraryBooks[5].title} খুলুন`}><span className="sr-only">{libraryBooks[5].title} খুলুন</span></button>
      </div>
    </section>}
    <p className="library-note">তাকের বইতে ট্যাপ করে খুলুন</p>
  </main>;
}
