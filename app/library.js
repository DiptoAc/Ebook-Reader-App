"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { books, book as defaultBook } from "../lib/book-content";

const libraryBooks = [
  {
    title: "সূর্যের একচ্ছত্র অধিকার অস্তের পূর্বে",
    cover: "প্রচ্ছদ - সূর্যের একচ্ছত্র অধিকার অস্তের পূর্বে.webp",
  },
  { title: "শোকার্ত আলোর নিচে", cover: "প্রচ্ছদ - শোকার্ত আলোর নীচে.webp" },
  {
    id: "prem-o-onnyanno",
    title: "প্রেম ও অন্যান্য কবিতা",
    cover: "প্রচ্ছদ - প্রেম ও অন্যান্য কবিতা।.webp",
    readable: true,
  },
  {
    id: "anubad-kobita",
    title: "অনুবাদ কবিতা",
    cover: "প্রচ্ছদ - অনুবাদ কবিতা।.webp",
    readable: true,
  },
  {
    id: "koyekti-bhera",
    title: "কয়েকটি ভেড়া ও একটি মানুষ",
    cover: "প্রচ্ছদ - কয়েকটি ভেড়া ও একটি মানুষ.webp",
    readable: true,
  },
  {
    id: "sonali-dobar",
    title: "সোনালি ডোবার শহরে",
    cover: "প্রচ্ছদ - সোনালি ডোবার শহরে.webp",
    readable: true,
  },
];
const frontPageDesigns = [
  {
    id: "bookcase",
    label: "বহুতল বইয়ের তাক",
    description: "গাছপালা ও সাজসজ্জাসহ কাঠের বুককেস",
  },
  {
    id: "classic",
    label: "এক সারির তাক",
    description: "পরিচ্ছন্ন, আগের নকশার একক তাক",
  },
  {
    id: "circular",
    label: "বইয়ের ক্যারোসেল",
    description: "স্ক্রল করে ঘুরিয়ে বই দেখার চলমান তাক",
  },
  {
    id: "expanding",
    label: "বিস্তৃত ক্যারোসেল",
    description: "মাঝের বইটি বড় হয়ে ওঠে, পাশেরগুলো ছোট হয়ে সরে যায়",
  },
  {
    id: "readera",
    label: "রিডার তালিকা",
    description: "Readera-অনুপ্রাণিত পরিচ্ছন্ন বইয়ের তালিকা",
  },
];

function Plant({ small = false }) {
  return (
    <div
      className={`shelf-plant${small ? " small-plant" : ""}`}
      aria-hidden="true"
    >
      <span className="plant-leaf leaf-one" />
      <span className="plant-leaf leaf-two" />
      <span className="plant-leaf leaf-three" />
      <span className="plant-pot" />
    </div>
  );
}

function FutureBookSlot({ className = "", style, onUnavailable }) {
  const content = <span>নতুন বই</span>;
  return onUnavailable ? (
    <button
      className={`future-book-slot ${className}`}
      style={style}
      onClick={() => onUnavailable("এই জায়গার বইটি এখনও যোগ করা হয়নি")}
      aria-label="নতুন বইয়ের জন্য খালি স্থান"
    >
      {content}
    </button>
  ) : (
    <div className={`future-book-slot ${className}`} style={style} aria-label="নতুন বইয়ের জন্য খালি স্থান">
      {content}
    </div>
  );
}

function DisplayBook({ entry, className = "", style, onOpen, onUnavailable, savedPage }) {
  const content = (
    <span className="cover-book">
      <img
        src={encodeURI(`/sequence/covers/${entry.cover}`)}
        alt={entry.title}
      />
      <span className="cover-book-title">{entry.title}</span>
    </span>
  );
  return entry.readable ? (
    <button
      className={`library-cover featured-book ${className}`}
      style={style}
      onClick={() => onOpen(entry.id)}
      aria-label={`${entry.title} খুলুন`}
    >
      {content}
      {savedPage > 0 && (
        <span className="resume">পৃষ্ঠা {savedPage + 1} থেকে</span>
      )}
    </button>
  ) : onUnavailable ? (
    <button
      className={`library-cover ${className}`}
      style={style}
      onClick={() => onUnavailable(`“${entry.title}” এখনও পাঠের জন্য যোগ করা হয়নি`)}
      aria-label={`${entry.title} এখনও যোগ করা হয়নি`}
    >
      {content}
    </button>
  ) : (
    <div
      className={`library-cover ${className}`}
      style={style}
      aria-label={entry.title}
    >
      {content}
    </div>
  );
}

function ReaderaBookRow({ entry, onOpen, onUnavailable, savedPage }) {
  const isAvailable = Boolean(entry.readable);
  const handleOpen = () =>
    isAvailable
      ? onOpen(entry.id)
      : onUnavailable(`“${entry.title}” এখনও পাঠের জন্য যোগ করা হয়নি`);
  return (
    <button
      className="readera-book-card"
      onClick={handleOpen}
      aria-label={isAvailable ? `${entry.title} খুলুন` : `${entry.title} এখনও যোগ করা হয়নি`}
    >
      <img src={encodeURI(`/sequence/covers/${entry.cover}`)} alt="" />
      <span className="readera-book-details">
        <strong>{entry.title}</strong>
        <small>{isAvailable ? (savedPage > 0 ? `পৃষ্ঠা ${savedPage + 1} থেকে চালিয়ে যান` : "পড়তে ট্যাপ করুন") : "শিগগিরই আসছে"}</small>
      </span>
      {!isAvailable && <span className="readera-card-lock" aria-hidden="true">⌁</span>}
    </button>
  );
}

function wrapQuoteLines(context, text, maxWidth) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";
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

function normalizeForSearch(value) {
  return value
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSearchPreview(text, normalizedQuery) {
  const compactText = text.replace(/\s+/g, " ").trim();
  const location = normalizeForSearch(compactText).indexOf(normalizedQuery);
  if (location < 0) return compactText.slice(0, 118);
  const start = Math.max(0, location - 38);
  const end = Math.min(compactText.length, location + normalizedQuery.length + 72);
  return `${start ? "…" : ""}${compactText.slice(start, end)}${end < compactText.length ? "…" : ""}`;
}

function HighlightedText({ text, query }) {
  const normalizedQuery = normalizeForSearch(query || "");
  if (!normalizedQuery) return text;
  const safePattern = normalizedQuery
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/ /g, "\\s+");
  const parts = text.split(new RegExp(`(${safePattern})`, "gu"));
  return parts.map((part, index) =>
    normalizeForSearch(part) === normalizedQuery ? (
      <mark key={index}>{part}</mark>
    ) : (
      part
    ),
  );
}

export default function Library() {
  const [isReading, setIsReading] = useState(false);
  const [activeBookId, setActiveBookId] = useState(defaultBook.id);
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState("next");
  const [bookmarks, setBookmarks] = useState({});
  const [frontPageDesign, setFrontPageDesign] = useState("circular");
  const [showSettings, setShowSettings] = useState(false);
  const [carouselRotation, setCarouselRotation] = useState(0);
  const carouselTouchStart = useRef(null);
  const [expandingIndex, setExpandingIndex] = useState(0);
  const expandingTouchStart = useRef(null);
  const [selectionMenu, setSelectionMenu] = useState(null);
  const [shareStatus, setShareStatus] = useState("");
  const [libraryNotice, setLibraryNotice] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedQuery, setHighlightedQuery] = useState("");
  const activeBook =
    books.find((item) => item.id === activeBookId) ?? defaultBook;
  // Every book, including the replacement edition of প্রেম ও অন্যান্য কবিতা,
  // now reads from its Unicode manuscript data rather than pre-rendered images.
  const usesWordRenderedPages = false;
  const readerPageCount = usesWordRenderedPages ? 48 : activeBook.pages.length;
  const detectedContentsPage = Math.max(
    0,
    activeBook.pages.findIndex((blocks) =>
      blocks.some((block) => /^১\./.test(block.text)),
    ),
  );
  const contentsPageIndexes = activeBook.contentsPageIndexes ?? [
    detectedContentsPage,
  ];
  const contentsPage = contentsPageIndexes[0] ?? detectedContentsPage;
  const currentPageBlocks = activeBook.pages[page] ?? [];
  const currentPageDensity = currentPageBlocks.reduce(
    (total, block) =>
      total + (block.text?.split("\n").length ?? 0) + (block.isTitle ? 1 : 0) + 1,
    0,
  );
  const currentPageCharacters = currentPageBlocks.reduce(
    (total, block) => total + (block.text?.length ?? 0),
    0,
  );
  const mobileReadingSize =
    currentPageDensity > 20 || currentPageCharacters > 950
      ? "mobile-reading-dense"
      : currentPageDensity > 15 || currentPageCharacters > 690
        ? "mobile-reading-compact"
        : "mobile-reading-comfort";
  const searchIndex = useMemo(() => {
    let poemTitle = activeBook.title;
    return activeBook.pages.flatMap((blocks, pageIndex) =>
      blocks.flatMap((block, blockIndex) => {
        const text = block.text || "";
        if (block.isTitle && !block.contentsContinuation) {
          poemTitle = text.replace(/\s+/g, " ").trim() || poemTitle;
        }
        const compactText = text.replace(/\s+/g, " ").trim();
        if (!compactText) return [];
        return [{
          page: pageIndex,
          block: blockIndex,
          poemTitle,
          text: compactText,
          normalizedText: normalizeForSearch(compactText),
        }];
      }),
    );
  }, [activeBook]);
  const normalizedSearchQuery = normalizeForSearch(searchQuery);
  const searchResults = normalizedSearchQuery
    ? searchIndex
        .filter((item) => item.normalizedText.includes(normalizedSearchQuery))
        .slice(0, 50)
    : [];

  useEffect(() => {
    const storedBookmarks = Object.fromEntries(
      books.map((item) => [
        item.id,
        Math.min(
          Math.max(Number(localStorage.getItem(`bookmark-${item.id}`)) || 0, 0),
          item.pages.length - 1,
        ),
      ]),
    );
    setBookmarks(storedBookmarks);
    const savedDesign = localStorage.getItem("front-page-design");
    if (savedDesign === "zigzag") localStorage.setItem("front-page-design", "bookcase");
    setFrontPageDesign(savedDesign === "zigzag" ? "bookcase" : savedDesign || "circular");
  }, []);

  function saveBookmark(bookId, bookmarkPage) {
    setBookmarks((current) => ({ ...current, [bookId]: bookmarkPage }));
    localStorage.setItem(`bookmark-${bookId}`, String(bookmarkPage));
  }

  function chooseFrontPageDesign(design) {
    setFrontPageDesign(design);
    localStorage.setItem("front-page-design", design);
    setShowSettings(false);
  }

  function showLibraryNotice(message) {
    setLibraryNotice(message);
    window.setTimeout(() => setLibraryNotice(""), 2600);
  }

  function rotateCarousel(event) {
    event.preventDefault();
    setCarouselRotation((rotation) => rotation + (event.deltaY > 0 ? 18 : -18));
  }

  function startCarouselTouch(event) {
    carouselTouchStart.current = event.touches[0]?.clientX ?? null;
  }

  function endCarouselTouch(event) {
    const startX = carouselTouchStart.current;
    const endX = event.changedTouches[0]?.clientX;
    carouselTouchStart.current = null;
    if (startX === null || endX === undefined || Math.abs(endX - startX) < 30)
      return;
    setCarouselRotation((rotation) => rotation + (endX < startX ? -18 : 18));
  }

  function moveExpandingCarousel(amount) {
    const itemCount = libraryBooks.length + 2;
    setExpandingIndex((current) => (current + amount + itemCount) % itemCount);
  }

  function rotateExpandingCarousel(event) {
    event.preventDefault();
    moveExpandingCarousel(event.deltaY > 0 ? 1 : -1);
  }

  function startExpandingTouch(event) {
    expandingTouchStart.current = event.touches[0]?.clientX ?? null;
  }

  function endExpandingTouch(event) {
    const startX = expandingTouchStart.current;
    const endX = event.changedTouches[0]?.clientX;
    expandingTouchStart.current = null;
    if (startX === null || endX === undefined || Math.abs(endX - startX) < 30)
      return;
    moveExpandingCarousel(endX < startX ? 1 : -1);
  }

  function captureSelection() {
    window.setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().replace(/\s+/g, " ").trim();
      if (!text || !selection?.rangeCount) return setSelectionMenu(null);
      const range = selection.getRangeAt(0);
      const selectionNode =
        range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentElement
          : range.commonAncestorContainer;
      const pageCopy = selectionNode.closest?.(".page-copy");
      if (!pageCopy) return setSelectionMenu(null);
      const rect = range.getBoundingClientRect();
      setSelectionMenu({
        text,
        left: Math.min(
          Math.max(rect.left + rect.width / 2, 94),
          window.innerWidth - 94,
        ),
        top: Math.max(rect.top - 10, 64),
      });
    }, 0);
  }

  function clearSelectionMenu() {
    window.getSelection()?.removeAllRanges();
    setSelectionMenu(null);
  }

  async function copyQuote() {
    try {
      await navigator.clipboard.writeText(selectionMenu.text);
      setShareStatus("উদ্ধৃতিটি কপি করা হয়েছে");
    } catch {
      setShareStatus("কপি করা যায়নি");
    }
    window.setTimeout(() => setShareStatus(""), 2200);
    clearSelectionMenu();
  }

  async function shareQuote() {
    const quote =
      selectionMenu.text.length > 500
        ? `${selectionMenu.text.slice(0, 497)}...`
        : selectionMenu.text;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext("2d");
    const background = context.createLinearGradient(0, 0, 1080, 1350);
    background.addColorStop(0, "#3b1609");
    background.addColorStop(0.55, "#7b351b");
    background.addColorStop(1, "#1e0b05");
    context.fillStyle = background;
    context.fillRect(0, 0, 1080, 1350);
    context.strokeStyle = "#d8ad5a";
    context.lineWidth = 5;
    context.strokeRect(50, 50, 980, 1250);
    context.strokeStyle = "rgba(255,231,172,.35)";
    context.lineWidth = 1;
    context.strokeRect(70, 70, 940, 1210);
    context.fillStyle = "#e4bd70";
    context.font = '600 31px "Noto Serif Bengali", serif';
    context.textAlign = "center";
    context.fillText(activeBook.title, 540, 155);
    context.fillStyle = "#f6e4be";
    context.font = "82px Georgia, serif";
    context.fillText("“", 540, 295);
    context.fillStyle = "#fff5dd";
    context.font = '600 51px "Noto Serif Bengali", serif';
    const lines = wrapQuoteLines(context, quote, 830);
    const lineHeight = 80;
    const startY = 375 - Math.max(0, (lines.length - 7) * 15);
    lines
      .slice(0, 11)
      .forEach((line, index) =>
        context.fillText(line, 540, startY + index * lineHeight),
      );
    context.fillStyle = "#f6e4be";
    context.font = "82px Georgia, serif";
    context.fillText(
      "”",
      540,
      Math.min(1100, startY + lines.slice(0, 11).length * lineHeight + 38),
    );
    context.fillStyle = "#e4bd70";
    context.font = '500 34px "Noto Serif Bengali", serif';
    context.fillText(`— ${activeBook.author}`, 540, 1180);
    context.fillStyle = "rgba(255,232,181,.62)";
    context.font = '400 25px "Noto Serif Bengali", serif';
    context.fillText(activeBook.title, 540, 1230);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) return;
    const file = new File([blob], `${activeBook.id}-quote.png`, {
      type: "image/png",
    });
    try {
      if (navigator.canShare?.({ files: [file] }))
        await navigator.share({
          files: [file],
          title: activeBook.title,
          text: `— ${activeBook.author}`,
        });
      else if (navigator.share)
        await navigator.share({
          title: activeBook.title,
          text: `${quote}\n— ${activeBook.author}`,
        });
      else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(link.href);
        setShareStatus("কোট কার্ডটি ডাউনলোড করা হয়েছে");
      }
    } catch (error) {
      if (error?.name !== "AbortError") setShareStatus("শেয়ার করা যায়নি");
    }
    window.setTimeout(() => setShareStatus(""), 2200);
    clearSelectionMenu();
  }

  function openBook(bookId = defaultBook.id) {
    const selectedBook =
      books.find((item) => item.id === bookId) ?? defaultBook;
    const resumePage = Math.min(
      Math.max(
        bookmarks[selectedBook.id] ??
          Number(localStorage.getItem(`bookmark-${selectedBook.id}`)) ??
          0,
        0,
      ),
      selectedBook.pages.length - 1,
    );
    setActiveBookId(selectedBook.id);
    setPage(resumePage);
    setSearchOpen(false);
    setSearchQuery("");
    setHighlightedQuery("");
    setIsReading(true);
  }

  function move(nextPage) {
    if (nextPage < 0 || nextPage >= readerPageCount) return;
    setDirection(nextPage > page ? "next" : "previous");
    setPage(nextPage);
    saveBookmark(activeBook.id, nextPage);
  }

  function closeBook() {
    saveBookmark(activeBook.id, page);
    setSearchOpen(false);
    setSearchQuery("");
    setHighlightedQuery("");
    setIsReading(false);
  }

  function openSearchResult(result) {
    setHighlightedQuery(searchQuery);
    setSearchOpen(false);
    move(result.page);
  }

  if (isReading) {
    return (
      <main className="reader-shell">
        <div className="reader-topbar">
          <button
            className="back-button"
            onClick={closeBook}
            aria-label="পাঠাগারে ফিরুন"
          >
            ← <span>পাঠাগার</span>
          </button>
          <div className="reader-jumps">
            <button
              className="reader-search-button"
              onClick={() => setSearchOpen(true)}
              aria-label="বইয়ের ভেতরে খুঁজুন"
            >
              ⌕ <span>খুঁজুন</span>
            </button>
            <button onClick={() => move(0)} disabled={page === 0}>
              প্রথম পাতা
            </button>
            <button
              onClick={() => move(contentsPage)}
              disabled={page === contentsPage}
            >
              সূচিপত্র
            </button>
          </div>
        </div>
        {searchOpen && (
          <div className="reader-search-overlay" role="dialog" aria-modal="true" aria-label="বইয়ের ভেতরে খুঁজুন">
            <div className="reader-search-panel">
              <div className="reader-search-heading">
                <div>
                  <p>{activeBook.title}</p>
                  <h2>বইয়ের ভেতরে খুঁজুন</h2>
                </div>
                <button onClick={() => setSearchOpen(false)} aria-label="Search বন্ধ করুন">×</button>
              </div>
              <label className="reader-search-input">
                <span aria-hidden="true">⌕</span>
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="শব্দ বা কবিতার নাম লিখুন"
                  aria-label="খোঁজার শব্দ"
                />
                {searchQuery && <button onClick={() => setSearchQuery("")} aria-label="লেখা মুছুন">×</button>}
              </label>
              <div className="reader-search-results" aria-live="polite">
                {!normalizedSearchQuery ? (
                  <p className="reader-search-hint">কবিতার নাম বা যেকোনো শব্দ লিখে খুঁজুন</p>
                ) : searchResults.length ? (
                  <>
                    <p className="reader-search-count">{searchResults.length === 50 ? "৫০+" : searchResults.length}টি ফল পাওয়া গেছে</p>
                    {searchResults.map((result) => (
                      <button key={`${result.page}-${result.block}`} onClick={() => openSearchResult(result)}>
                        <span className="reader-search-result-title">{result.poemTitle}</span>
                        <span>{makeSearchPreview(result.text, normalizedSearchQuery)}</span>
                        <small>পৃষ্ঠা {result.page + 1} →</small>
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="reader-search-hint">কোনো মিল পাওয়া যায়নি</p>
                )}
              </div>
            </div>
          </div>
        )}
        {selectionMenu && (
          <div
            className="selection-toolbar"
            style={{ left: selectionMenu.left, top: selectionMenu.top }}
            onMouseDown={(event) => event.preventDefault()}
          >
            <button onClick={copyQuote}>কপি</button>
            <button className="share-quote-button" onClick={shareQuote}>
              শেয়ার
            </button>
          </div>
        )}
        {shareStatus && (
          <div className="share-status" role="status">
            {shareStatus}
          </div>
        )}
        <section
          className="open-book"
          aria-label={`${activeBook.title} পড়া হচ্ছে`}
        >
          <div className="bookmark">চিহ্নিত</div>
          <article
            key={page}
            className={`paper-page ${direction} ${mobileReadingSize}${!usesWordRenderedPages && activeBook.pages[page].length > 25 ? " dense-page" : ""}${usesWordRenderedPages ? " rendered-doc-page" : ""}`}
          >
            {!usesWordRenderedPages && (
              <div className="page-head">
                <span>{activeBook.title}</span>
                <span>{page + 1}</span>
              </div>
            )}
            {usesWordRenderedPages ? (
              <img
                className="rendered-doc-image"
                src={`/rendered-books/prem-o-onnyanno/page-${String(page + 1).padStart(2, "0")}.png`}
                alt={`${activeBook.title}, পৃষ্ঠা ${page + 1}`}
              />
            ) : contentsPageIndexes.includes(page) &&
              activeBook.contents?.length ? (
              <nav className="contents-list" aria-label="কবিতার সূচিপত্র">
                <h2>
                  {page === contentsPageIndexes[0]
                    ? "সূচিপত্র"
                    : "সূচিপত্র (চলমান)"}
                </h2>
                {activeBook.contents
                  .slice(
                    contentsPageIndexes.length > 1 &&
                      page === contentsPageIndexes[0]
                      ? 0
                      : contentsPageIndexes.length > 1
                        ? Math.ceil(activeBook.contents.length / 2)
                        : 0,
                    contentsPageIndexes.length > 1 &&
                      page === contentsPageIndexes[0]
                      ? Math.ceil(activeBook.contents.length / 2)
                      : undefined,
                  )
                  .map((item) => (
                    <button key={item.label} onClick={() => move(item.page)}>
                      <span>{item.label}</span>
                      <span>পৃষ্ঠা {item.page + 1} →</span>
                    </button>
                  ))}
              </nav>
            ) : (
              <div
                className="page-copy"
                onMouseUp={captureSelection}
                onTouchEnd={captureSelection}
              >
                {activeBook.pages[page].map((block, index) => (
                  <p
                    key={index}
                    className={`document-block align-${block.alignment}${block.spacer ? " document-spacer" : ""}${block.isTitle ? " poem-title" : ""}`}
                  >
                    <HighlightedText text={block.text} query={highlightedQuery} />
                  </p>
                ))}
              </div>
            )}
            {!usesWordRenderedPages && (
              <div className="page-number">
                পৃষ্ঠা {page + 1} / {readerPageCount}
              </div>
            )}
            <button
              className="page-curl page-curl-previous"
              onClick={() => move(page - 1)}
              disabled={page === 0}
              aria-label="আগের পাতায় যান"
            >
              <span className="curl-under" aria-hidden="true" />
              <span className="curl-shadow" aria-hidden="true" />
              <span className="curl-fold" aria-hidden="true">
                <span className="curl-sheen" />
              </span>
            </button>
            <button
              className="page-curl page-curl-next"
              onClick={() => move(page + 1)}
              disabled={page === readerPageCount - 1}
              aria-label="পরের পাতায় যান"
            >
              <span className="curl-under" aria-hidden="true" />
              <span className="curl-shadow" aria-hidden="true" />
              <span className="curl-fold" aria-hidden="true">
                <span className="curl-sheen" />
              </span>
            </button>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className={`library-shell front-design-${frontPageDesign}`}>
      <header className="library-header">
        <p>এনেছি রঙের নহর</p>
        <h1>আমার বই</h1>
        <span>একটি বই বেছে নিয়ে পড়া শুরু করুন</span>
      </header>
      <button
        className="settings-button"
        onClick={() => setShowSettings(true)}
        aria-label="প্রথম পাতার নকশা বদলান"
      >
        ⚙ <span>সাজসজ্জা</span>
      </button>
      {showSettings && (
        <div
          className="settings-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="প্রথম পাতার নকশা"
        >
          <div className="settings-panel">
            <button
              className="settings-close"
              onClick={() => setShowSettings(false)}
              aria-label="বন্ধ করুন"
            >
              ×
            </button>
            <h2>প্রথম পাতার নকশা</h2>
            <p>আপনার পছন্দের পাঠাগারটি বেছে নিন</p>
            <div className="design-choices">
              {frontPageDesigns.map((design) => (
                <button
                  key={design.id}
                  className={frontPageDesign === design.id ? "selected" : ""}
                  onClick={() => chooseFrontPageDesign(design.id)}
                >
                  <strong>{design.label}</strong>
                  <span>{design.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {libraryNotice && (
        <div className="library-toast" role="status">
          {libraryNotice}
        </div>
      )}
      {frontPageDesign === "classic" ? (
        <section className="classic-shelf" aria-label="বইয়ের তাক">
          <div className="classic-scroll-track">
            {libraryBooks.map((entry) => (
              <DisplayBook
                key={entry.title}
                entry={entry}
                onOpen={openBook}
                onUnavailable={showLibraryNotice}
                savedPage={bookmarks[entry.id] ?? 0}
              />
            ))}
            <FutureBookSlot onUnavailable={showLibraryNotice} />
            <FutureBookSlot onUnavailable={showLibraryNotice} />
          </div>
        </section>
      ) : frontPageDesign === "readera" ? (
        <section className="readera-library" aria-label="বইয়ের তালিকা">
          <div className="readera-toolbar">
            <button className="readera-icon-button" aria-label="মেনু">☰</button>
            <strong>পাঠাগার</strong>
            <button
              className="readera-icon-button"
              onClick={() => setShowSettings(true)}
              aria-label="সাজসজ্জা বদলান"
            >
              ⚙
            </button>
          </div>
          <div className="readera-library-heading">
            <div><p>আমার সংগ্রহ</p><h2>সব বই</h2></div>
            <span>{libraryBooks.length}টি বই</span>
          </div>
          <button className="readera-search" aria-label="বই খুঁজুন">
            <span aria-hidden="true">⌕</span> বই খুঁজুন
          </button>
          <nav className="readera-tabs" aria-label="বইয়ের ধরন">
            <span className="active">সব</span>
            <span>পড়ছি</span>
            <span>পছন্দের</span>
          </nav>
          <div className="readera-list">
            {libraryBooks.map((entry) => (
              <ReaderaBookRow
                key={entry.title}
                entry={entry}
                onOpen={openBook}
                onUnavailable={showLibraryNotice}
                savedPage={bookmarks[entry.id] ?? 0}
              />
            ))}
            <button
              className="readera-empty-card"
              onClick={() => showLibraryNotice("এই জায়গার বইটি এখনও যোগ করা হয়নি")}
            >
              <span>＋</span> নতুন বই শিগগিরই যোগ হবে
            </button>
            <button
              className="readera-empty-card"
              onClick={() => showLibraryNotice("এই জায়গার বইটি এখনও যোগ করা হয়নি")}
            >
              <span>＋</span> নতুন বই শিগগিরই যোগ হবে
            </button>
          </div>
          <nav className="readera-bottom-nav" aria-label="পাঠাগার নেভিগেশন">
            <span className="active"><b>▣</b>বই</span>
            <span><b>◷</b>পড়ছি</span>
            <span><b>♡</b>পছন্দের</span>
            <span><b>☷</b>তালিকা</span>
          </nav>
        </section>
      ) : frontPageDesign === "expanding" ? (
        <section className="expanding-carousel" aria-label="বিস্তৃত বইয়ের ক্যারোসেল">
          <p>ডানে-বামে সোয়াইপ বা স্ক্রল করে বই বাছুন</p>
          <div
            className="expanding-track"
            onWheel={rotateExpandingCarousel}
            onTouchStart={startExpandingTouch}
            onTouchEnd={endExpandingTouch}
            role="region"
            aria-label="সোয়াইপ বা স্ক্রল করে বইয়ের তালিকা সরান"
          >
            {[...libraryBooks, null, null].map((entry, index, items) => {
              let offset = index - expandingIndex;
              if (offset > items.length / 2) offset -= items.length;
              if (offset < -items.length / 2) offset += items.length;
              const visible = Math.abs(offset) <= 2;
              const className = `expanding-book expanding-offset-${offset}`;
              const style = {
                zIndex: 10 - Math.abs(offset),
                opacity: visible ? 1 : 0,
                pointerEvents: offset === 0 ? "auto" : "none",
              };
              return entry ? (
                <DisplayBook
                  key={entry.title}
                  entry={entry}
                  className={className}
                  style={style}
                  onOpen={openBook}
                  onUnavailable={showLibraryNotice}
                  savedPage={bookmarks[entry.id] ?? 0}
                />
              ) : (
                <FutureBookSlot
                  key={`future-expanding-${index}`}
                  className={className}
                  style={style}
                  onUnavailable={showLibraryNotice}
                />
              );
            })}
          </div>
          <div className="expanding-caption" aria-live="polite">
            <strong>
              {libraryBooks[expandingIndex]?.title || "নতুন বই আসছে"}
            </strong>
            <span>
              {libraryBooks[expandingIndex]?.readable
                ? "বইটি খুলতে প্রচ্ছদে ট্যাপ করুন"
                : "শিগগিরই পাঠাগারে যোগ হবে"}
            </span>
          </div>
          <div className="expanding-dots" aria-label="বই নির্বাচন">
            {[...libraryBooks, null, null].map((entry, index) => (
              <button
                key={`expanding-dot-${index}`}
                className={index === expandingIndex ? "active" : ""}
                onClick={() => setExpandingIndex(index)}
                aria-label={entry?.title || "নতুন বইয়ের খালি স্থান"}
                aria-current={index === expandingIndex ? "true" : undefined}
              />
            ))}
          </div>
        </section>
      ) : frontPageDesign === "circular" ? (
        <section className="circular-room" aria-label="বইয়ের ক্যারোসেল">
          <p>বইয়ের তাক ঘোরাতে স্ক্রল বা ডানে-বামে সোয়াইপ করুন</p>
          <div
            className="circular-shelf"
            onWheel={rotateCarousel}
            onTouchStart={startCarouselTouch}
            onTouchEnd={endCarouselTouch}
            role="region"
            aria-label="স্ক্রল বা সোয়াইপ করে বইয়ের ক্যারোসেল ঘোরান"
          >
            <div className="circular-ring" aria-hidden="true" />
            {[
              libraryBooks[5],
              ...libraryBooks.slice(1, 5),
              libraryBooks[0],
              null,
              null,
            ].map((entry, index, entries) => {
              const angle =
                (carouselRotation + index * (360 / entries.length)) *
                (Math.PI / 180);
              const depth = (Math.cos(angle) + 1) / 2;
              const visible = depth > 0.54;
              const x = Math.sin(angle) * 335;
              const y = 68 - depth * 102;
              const scale = 0.38 + depth * 0.62;
              const tilt = -Math.sin(angle) * 42;
              const style = {
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale}) rotateY(${tilt}deg)`,
                zIndex: Math.round(depth * 100),
                opacity: visible ? 0.32 + depth * 0.68 : 0,
                pointerEvents: visible ? "auto" : "none",
              };
              return entry ? (
                <DisplayBook
                  key={entry.title}
                  entry={entry}
                  className="carousel-slot"
                  style={style}
                  onOpen={openBook}
                  onUnavailable={showLibraryNotice}
                  savedPage={bookmarks[entry.id] ?? 0}
                />
              ) : (
                <FutureBookSlot
                  key={`future-${index}`}
                  className="carousel-slot"
                  style={style}
                  onUnavailable={showLibraryNotice}
                />
              );
            })}
            <div className="carousel-hub" aria-hidden="true">
              পাঠশালা
            </div>
          </div>
        </section>
      ) : (
        <section className="shelf-viewport" aria-label="বইয়ের তাক">
          <div className="bookcase">
            <img
              className="bookcase-photo"
              src={encodeURI("/Eight book shelf books added.webp")}
              alt="ছয়টি বই ও দুটি খালি স্থানসহ কাঠের বইয়ের তাক"
            />
            <button
              className="photo-book-hitbox photo-book-anubad"
              onClick={() => openBook("anubad-kobita")}
              aria-label={`${libraryBooks[3].title} খুলুন`}
            >
              <span className="sr-only">{libraryBooks[3].title} খুলুন</span>
            </button>
            <button
              className="photo-book-hitbox photo-book-bhera"
              onClick={() => openBook("koyekti-bhera")}
              aria-label={`${libraryBooks[4].title} খুলুন`}
            >
              <span className="sr-only">{libraryBooks[4].title} খুলুন</span>
            </button>
            <button
              className="photo-book-hitbox photo-book-prem"
              onClick={() => openBook("prem-o-onnyanno")}
              aria-label={`${libraryBooks[2].title} খুলুন`}
            >
              <span className="sr-only">{libraryBooks[2].title} খুলুন</span>
            </button>
            <button
              className="photo-book-hitbox photo-book-sonali"
              onClick={() => showLibraryNotice(`“${libraryBooks[0].title}” এখনও পাঠের জন্য যোগ করা হয়নি`)}
              aria-label={`${libraryBooks[0].title} এখনও যোগ করা হয়নি`}
            >
              <span className="sr-only">{libraryBooks[0].title} এখনও যোগ করা হয়নি</span>
            </button>
            <button
              className="photo-book-hitbox photo-book-unavailable-top"
              onClick={() => showLibraryNotice(`“${libraryBooks[1].title}” এখনও পাঠের জন্য যোগ করা হয়নি`)}
              aria-label={`${libraryBooks[1].title} এখনও যোগ করা হয়নি`}
            >
              <span className="sr-only">{libraryBooks[1].title} এখনও যোগ করা হয়নি</span>
            </button>
            <button
              className="photo-book-hitbox photo-book-unavailable-bottom"
              onClick={() => openBook("sonali-dobar")}
              aria-label={`${libraryBooks[5].title} খুলুন`}
            >
              <span className="sr-only">{libraryBooks[5].title} খুলুন</span>
            </button>
            <button
              className="photo-book-hitbox photo-book-future-one"
              onClick={() => showLibraryNotice("এই জায়গার বইটি এখনও যোগ করা হয়নি")}
              aria-label="নতুন বইয়ের জন্য খালি স্থান"
            />
            <button
              className="photo-book-hitbox photo-book-future-two"
              onClick={() => showLibraryNotice("এই জায়গার বইটি এখনও যোগ করা হয়নি")}
              aria-label="নতুন বইয়ের জন্য খালি স্থান"
            />
          </div>
        </section>
      )}
      <p className="library-note">তাকের বইতে ট্যাপ করে খুলুন</p>
      <a
        className="author-blog-link"
        href="https://proccod.blogspot.com/"
        target="_blank"
        rel="noreferrer"
      >
        লেখকের আরও লেখা পড়ুন: <strong>লেখকের ব্লগ ↗</strong>
      </a>
    </main>
  );
}
