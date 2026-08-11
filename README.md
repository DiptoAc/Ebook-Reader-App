# সোনালি ডোবার শহর বিজয় — Digital Library

A responsive Next.js reading app built from the supplied manuscript and requirements.

## Run it

1. Install dependencies with `npm install`.
2. Start the local app with `npm run dev`.
3. Open the address shown in the terminal.

The book-preparation step runs automatically whenever the app starts or is built. It reads the Unicode master in `manuscripts/Unicode/`, extracts its paragraphs, and regenerates `lib/book-content.js` as fixed reader pages.

## Manuscript encoding

The original manuscript is retained in `manuscripts/SutonnyMJ/`. Its Unicode Bengali counterpart in `manuscripts/Unicode/` is the source used by the app, so the text displays reliably across devices.

## Included experience

- Horizontal wooden bookshelf with one curated title and six non-interactive empty slots
- Tap-to-open book, with no search or sorting UI
- One page at a time only, using forward/back page-turn animation
- Bookmark ribbon and locally saved resume position
- Responsive layout for phone and desktop
