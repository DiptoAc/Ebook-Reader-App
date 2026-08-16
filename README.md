# প্রণব আচার্য্যের ডিজিটাল পাঠাগার

A responsive Bengali ebook library and reader for Pranab Acharyya's books. It presents Unicode Bengali manuscripts as a book-like reading experience, with a home-library interface, search, quote sharing, reading preferences, and a book-grounded AI assistant.

For reader-facing instructions in Bengali, see [ব্যবহার নির্দেশিকা](docs/ব্যবহার-নির্দেশিকা.md).

## Features

### Library and books

- Multiple home-screen layouts: **বহুতল বইয়ের তাক**, **এক সারির তাক**, **ক্যারোসেল**, and **রিডার তালিকা**.
- The selected home layout is remembered on the device. New visitors start with the multi-storey bookshelf.
- Responsive book covers and shelves for desktop and mobile.
- Unavailable books have a clear “not added yet” notice instead of opening an empty reader.
- Link to the author's blog from the home page.

### Reading interface

- Book-like single-page reader with animated page turns, page curls, and left/right swipe navigation.
- Clickable **সূচিপত্র** entries jump to their corresponding poem or section.
- Search inside the open book, with matching text highlighted.
- Each book remembers its own last-opened page on the device.
- Text selection provides copy and share actions. Sharing creates a quote card with the correct book and author attribution.
- Day, night, and **পুরোনো বই** (sepia/aged paper) page appearances. The page curl changes colour with the selected page appearance.
- Adaptive mobile layout and text sizing for readable pages on smaller screens.

### AI library assistant

- Expandable chat assistant on the home page.
- Answers are grounded in excerpts from the included books and return clickable source links.
- Uses semantic embedding search first, with keyword search as a fallback.
- Bengali and common English topic words can both help retrieve Bengali book content.
- Gemini model fallback: if a supported generation model returns a quota `429`, the same question is retried with the next supported model.

## Technology stack

| Area | Technology |
| --- | --- |
| Application | Next.js 15, React 19, JavaScript |
| Styling | Custom responsive CSS (no UI framework) |
| Manuscript preparation | Node.js scripts and DOCX/XML extraction |
| Bengali conversion | `@abdalgolabs/ansi-unicode-converter` |
| AI answer generation | Google Gemini API |
| Semantic retrieval | Gemini `gemini-embedding-2`, 768-dimensional vectors, cosine similarity |
| Hosting | Netlify-compatible Next.js deployment |
| Local saved preferences | Browser `localStorage` |

## Project structure

```text
app/
  api/ask/route.js          Server-side RAG and Gemini answer endpoint
  library.js                Home library and reading interface
  globals.css               Responsive visual styling
lib/
  book-content.js           Prepared book pages used by the reader
  book-chunks.mjs           Shared searchable-book chunk builder
  book-embeddings.json      Generated semantic-search index
  book-rag.js               Semantic and keyword retrieval logic
scripts/
  prepare-book.mjs          Extracts Unicode DOCX manuscripts into book-content.js
  generate-embeddings.mjs   Generates/resumes the embedding index
manuscripts/
  Unicode/                  Unicode Bengali master DOCX files used by the app
  SutonnyMJ/                Original legacy-font source manuscripts
public/
  covers/                   WebP book covers and other visual assets
```

## Run locally

### 1. Install dependencies

```cmd
npm install
```

### 2. Add a Gemini key

Copy `.env.local.example` to a new file named `.env.local`, then add your own key:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Never commit `.env.local`, share the key, or place it in browser/client-side code.

### 3. Start the app

```cmd
npm run dev
```

Open the local address printed in the terminal, normally `http://localhost:3000`.

## How to use the app

1. From the home screen, choose a book cover to open a readable book.
2. Use **সাজসজ্জা** to select a library presentation.
3. In the reader, swipe left/right or tap a page curl to turn pages.
4. Open **সূচিপত্র** to jump directly to a poem or section.
5. Use the search control to find words or poem titles in the open book.
6. Select text to copy it or create a shareable quote card.
7. Open the reader appearance menu to choose day, night, or sepia paper.
8. On the home screen, tap **জিজ্ঞেস করুন** to ask the book assistant a question. Source links in its answer open the relevant book page.

## Updating book content

The app displays content prepared from the Unicode DOCX manuscripts in `manuscripts/Unicode/`.

After editing or adding a Unicode manuscript, run:

```cmd
npm run prepare-book
```

This regenerates `lib/book-content.js`.

Then regenerate the semantic-search index:

```cmd
npm run generate-embeddings
```

The embedding script is manual by design. It does **not** run during every build, so ordinary visual/code changes do not consume Gemini embedding quota. The script saves progress after each batch and can resume after a Gemini rate-limit wait.

After either generated file changes, commit both generated files with the related source changes:

```cmd
git add manuscripts/Unicode lib/book-content.js lib/book-embeddings.json
```

## How the AI assistant works

```text
Reader question
  → Create a query embedding on the server
  → Compare it with saved book embeddings
  → Select the nearest four book excerpts
  → Send only those excerpts plus the question to Gemini
  → Return a Bengali answer with source links
```

The embedding index is imported only by the server-side `/api/ask` route. It is not included in the home-page browser bundle.

If embedding retrieval is temporarily unavailable, the app falls back to its Bengali/English keyword-topic search. If one Gemini generation model is quota-limited, the server tries the next supported fallback model. If all models are unavailable or quota-limited, the assistant shows a friendly error message.

## Build and deploy

Create a production build locally with:

```cmd
npm run build
```

For Netlify, configure the following environment variable in **Site configuration → Environment variables**:

```text
GEMINI_API_KEY
```

Use the same private key as local development, then trigger a new deployment after changing environment variables or pushing changes to the production branch.

## Important notes

- Gemini quotas are controlled by Google AI Studio and may vary by model and project.
- The reader, search, shelf designs, and saved reading position work even if the AI assistant has no available quota.
- The AI assistant is designed to answer only from retrieved book excerpts; it should not be treated as a source outside this library.
