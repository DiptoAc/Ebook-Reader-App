import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeLibraryChunks } from "../lib/book-chunks.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "lib", "book-content.js");
const outputPath = path.join(root, "lib", "book-embeddings.json");
const model = "gemini-embedding-2";
const dimensions = 768;
const batchSize = 20;

function loadLocalApiKey() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) throw new Error("Missing .env.local with GEMINI_API_KEY");
  const line = fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/u)
    .find((value) => value.startsWith("GEMINI_API_KEY="));
  const key = line?.slice("GEMINI_API_KEY=".length).trim().replace(/^['"]|['"]$/gu, "");
  if (!key) throw new Error("GEMINI_API_KEY is missing from .env.local");
  return key;
}

async function loadBooks() {
  const source = fs.readFileSync(sourcePath, "utf8");
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return (await import(moduleUrl)).books;
}

async function embedBatch(chunks, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        requests: chunks.map((chunk) => ({
          model: `models/${model}`,
          content: { parts: [{ text: chunk.text }] },
          embedContentConfig: {
            taskType: "RETRIEVAL_DOCUMENT",
            title: `${chunk.bookTitle} — ${chunk.sectionTitle}`,
            outputDimensionality: dimensions,
          },
        })),
      }),
    },
  );
  if (!response.ok) throw new Error(`Embedding request failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const data = await response.json();
  if (!Array.isArray(data.embeddings) || data.embeddings.length !== chunks.length) {
    throw new Error("Gemini returned an incomplete embedding batch");
  }
  return data.embeddings.map((embedding) => embedding.values);
}

const apiKey = loadLocalApiKey();
const books = await loadBooks();
const chunks = makeLibraryChunks(books);
const sourceSignature = crypto.createHash("sha256")
  .update(chunks.map((chunk) => `${chunk.id}\n${chunk.text}`).join("\n\n"))
  .digest("hex");
const savedIndex = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, "utf8")) : null;
const embeddedById = new Map(
  savedIndex?.sourceSignature === sourceSignature && savedIndex.model === model && savedIndex.dimensions === dimensions
    ? savedIndex.chunks.map((chunk) => [chunk.id, chunk])
    : [],
);

function saveIndex() {
  const orderedChunks = chunks.map((chunk) => embeddedById.get(chunk.id)).filter(Boolean);
  fs.writeFileSync(outputPath, JSON.stringify({
    version: 1,
    model,
    dimensions,
    sourceSignature,
    generatedAt: new Date().toISOString(),
    chunks: orderedChunks,
  }));
  return orderedChunks;
}

const pendingChunks = chunks.filter((chunk) => !embeddedById.has(chunk.id));
console.log(`${chunks.length - pendingChunks.length}/${chunks.length} chunks already available.`);

for (let start = 0; start < pendingChunks.length; start += batchSize) {
  const batch = pendingChunks.slice(start, start + batchSize);
  const embeddings = await embedBatch(batch, apiKey);
  batch.forEach((chunk, index) => {
    embeddedById.set(chunk.id, {
      id: chunk.id,
      bookId: chunk.bookId,
      bookTitle: chunk.bookTitle,
      sectionTitle: chunk.sectionTitle,
      page: chunk.page,
      text: chunk.text,
      embedding: embeddings[index].map((value) => Number(value.toFixed(6))),
    });
  });
  const savedChunks = saveIndex();
  console.log(`Embedded ${savedChunks.length}/${chunks.length} chunks.`);
}

const savedChunks = saveIndex();
console.log(`Saved ${savedChunks.length} embeddings to ${pathToFileURL(outputPath).pathname}.`);
