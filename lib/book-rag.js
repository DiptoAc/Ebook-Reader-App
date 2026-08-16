import { books } from "./book-content";
import embeddingIndex from "./book-embeddings.json";
import { makeLibraryChunks, normal } from "./book-chunks.mjs";

const TOPIC_TERMS = {
  রোমান্টিক: ["প্রেম", "ভালোবাস", "ভালবাস", "চুম্বন", "প্রণয়", "প্রণয়ের", "বিরহ", "তুমি", "হৃদয়"],
  প্রেম: ["ভালোবাস", "ভালবাস", "চুম্বন", "প্রণয়", "বিরহ", "তুমি"],
  ভালোবাসা: ["প্রেম", "ভালবাস", "চুম্বন", "প্রণয়", "বিরহ"],
  love: ["প্রেম", "ভালোবাস", "ভালবাস", "চুম্বন", "প্রণয়", "বিরহ", "তুমি"],
  romantic: ["প্রেম", "ভালোবাস", "ভালবাস", "চুম্বন", "প্রণয়", "বিরহ"],
  romance: ["প্রেম", "ভালোবাস", "ভালবাস", "চুম্বন", "প্রণয়", "বিরহ"],
  বিরহ: ["প্রেম", "ভালোবাস", "ভালবাস", "একাক", "নিঃসঙ্গ", "অপেক্ষা", "বিদায়"],
  শৈশব: ["শৈশব", "শিশু", "ছেলেবেলা", "কৈশোর", "খেল", "স্কুল"],
  childhood: ["শৈশব", "শিশু", "ছেলেবেলা", "কৈশোর", "খেল", "স্কুল"],
  children: ["শৈশব", "শিশু", "ছেলেবেলা", "কৈশোর", "খেল", "স্কুল"],
  প্রকৃতি: ["বৃষ্টি", "নদী", "আকাশ", "গাছ", "পাখি", "ফুল", "মাটি", "রোদ"],
  nature: ["বৃষ্টি", "নদী", "আকাশ", "গাছ", "পাখি", "ফুল", "মাটি", "রোদ"],
  মৃত্যু: ["মৃত্যু", "শেষ", "বিদায়", "প্রস্থান", "শোক", "অন্ধকার"],
  death: ["মৃত্যু", "শেষ", "বিদায়", "প্রস্থান", "শোক", "অন্ধকার"],
  শহর: ["শহর", "ঢাকা", "রাস্তা", "গলি", "বাজার", "বাড়ি"],
  city: ["শহর", "ঢাকা", "রাস্তা", "গলি", "বাজার", "বাড়ি"],
};

const libraryChunks = makeLibraryChunks(books);

function termsForQuestion(question) {
  const base = normal(question).split(" ").filter((word) => word.length > 1);
  const expanded = [...base];
  Object.entries(TOPIC_TERMS).forEach(([topic, terms]) => {
    if (normal(question).includes(topic)) expanded.push(...terms);
  });
  return [...new Set(expanded)];
}

function keywordRetrieve(question, limit) {
  const terms = termsForQuestion(question);
  const query = normal(question);
  const scored = libraryChunks
    .map((chunk) => {
      let score = 0;
      terms.forEach((term) => {
        if (chunk.searchable.includes(term)) score += 2;
        if (normal(chunk.sectionTitle).includes(term)) score += 8;
        if (normal(chunk.bookTitle).includes(term)) score += 7;
      });
      if (query && chunk.searchable.includes(query)) score += 16;
      return { ...chunk, score };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score || a.page - b.page);

  return scored.slice(0, limit).map(({ searchable, score, id, ...chunk }) => chunk);
}

function cosineSimilarity(first, second) {
  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;
  for (let index = 0; index < first.length; index += 1) {
    dotProduct += first[index] * second[index];
    firstMagnitude += first[index] ** 2;
    secondMagnitude += second[index] ** 2;
  }
  return dotProduct / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude) || 1);
}

async function embedQuestion(question, apiKey) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: "models/gemini-embedding-2",
        content: { parts: [{ text: question }] },
        embedContentConfig: {
          taskType: "RETRIEVAL_QUERY",
          outputDimensionality: embeddingIndex.dimensions,
        },
      }),
    },
  );
  if (!response.ok) throw new Error(`Embedding request failed: ${response.status}`);
  const data = await response.json();
  return data.embedding?.values;
}

export async function retrieveLibraryContext(question, apiKey, limit = 4) {
  if (!embeddingIndex.chunks?.length) return keywordRetrieve(question, limit);
  try {
    const questionEmbedding = await embedQuestion(question, apiKey);
    if (!questionEmbedding?.length) throw new Error("Empty query embedding");
    return embeddingIndex.chunks
      .filter((chunk) => chunk.embedding?.length === questionEmbedding.length)
      .map((chunk) => ({ ...chunk, score: cosineSimilarity(questionEmbedding, chunk.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ embedding, score, id, ...chunk }) => chunk);
  } catch (error) {
    console.warn("Embedding retrieval unavailable; using keyword retrieval", error.message);
    return keywordRetrieve(question, limit);
  }
}
