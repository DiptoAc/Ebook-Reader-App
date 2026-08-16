import { retrieveLibraryContext } from "../../../lib/book-rag";

export const runtime = "nodejs";

const REQUEST_WINDOW_MS = 10 * 60 * 1000;
const REQUEST_LIMIT = 12;
const visits = new Map();
const PREFERRED_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
];
let cachedModels = null;
let modelLookup = null;
let activeModel = null;
const exhaustedModels = new Map();

async function availableGeminiModels(apiKey) {
  if (cachedModels) return cachedModels;
  if (!modelLookup) {
    modelLookup = (async () => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      );
      if (!response.ok) throw new Error("Unable to list Gemini models");
      const { models = [] } = await response.json();
      const supported = new Set(
        models
          .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
          .map((model) => model.name?.replace(/^models\//u, "")),
      );
      cachedModels = PREFERRED_MODELS.filter((model) => supported.has(model));
      if (!cachedModels.length) {
        const fallback = [...supported].find((model) => model.includes("flash"));
        if (fallback) cachedModels = [fallback];
      }
      if (!cachedModels.length) throw new Error("No compatible Gemini text model is available");
      return cachedModels;
    })().catch((error) => {
      modelLookup = null;
      throw error;
    });
  }
  return modelLookup;
}

function modelsToTry(models) {
  const now = Date.now();
  const usableModels = models.filter((model) => {
    const retryAfter = exhaustedModels.get(model) ?? 0;
    if (retryAfter <= now) exhaustedModels.delete(model);
    return retryAfter <= now;
  });
  if (activeModel && usableModels.includes(activeModel)) {
    return [activeModel, ...usableModels.filter((model) => model !== activeModel)];
  }
  return usableModels;
}

function clientKey(request) {
  return request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
}

function isRateLimited(request) {
  const now = Date.now();
  const key = clientKey(request);
  const recent = (visits.get(key) ?? []).filter((time) => now - time < REQUEST_WINDOW_MS);
  if (recent.length >= REQUEST_LIMIT) return true;
  recent.push(now);
  visits.set(key, recent);
  return false;
}

export async function POST(request) {
  try {
    if (isRateLimited(request)) {
      return Response.json({ error: "কিছুক্ষণ পরে আবার চেষ্টা করুন।" }, { status: 429 });
    }
    const { question } = await request.json();
    const cleanQuestion = String(question ?? "").replace(/\s+/gu, " ").trim();
    if (cleanQuestion.length < 2 || cleanQuestion.length > 500) {
      return Response.json({ error: "২ থেকে ৫০০ অক্ষরের মধ্যে প্রশ্ন লিখুন।" }, { status: 400 });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "লাইব্রেরি সহকারীটি এখনও প্রস্তুত করা হচ্ছে।" }, { status: 503 });
    }
    const sources = await retrieveLibraryContext(cleanQuestion, apiKey);
    if (!sources.length) {
      return Response.json({
        answer: "এই পাঠাগারের বইগুলোতে প্রশ্নটির সঙ্গে মিল পাওয়া যায়নি। অন্যভাবে লিখে চেষ্টা করুন।",
        sources: [],
      });
    }
    const context = sources.map((source, index) => (
      `[${index + 1}] ${source.kind === "manual" ? "নির্দেশিকা" : "বই"}: ${source.bookTitle}\nবিভাগ: ${source.sectionTitle}\n${source.kind === "manual" ? "" : `পৃষ্ঠা: ${source.page + 1}\n`}পাঠ্য:\n${source.text}`
    )).join("\n\n");
    const models = modelsToTry(await availableGeminiModels(apiKey));
    const prompt = `তুমি প্রণব আচার্য্যের ডিজিটাল পাঠাগারের সহকারী। শুধু নিচে দেওয়া বইয়ের পাঠ্যাংশ ও অ্যাপ-ব্যবহার নির্দেশিকার ভিত্তিতে শুদ্ধ, সহজ বাংলায় উত্তর দাও। অ্যাপ কীভাবে ব্যবহার করতে হয়—এমন প্রশ্নে নির্দেশিকার তথ্য ব্যবহার করো; বই, কবিতা বা লেখক সম্পর্কিত প্রশ্নে বইয়ের পাঠ্যাংশ ব্যবহার করো। পাঠ্যাংশে উত্তর না থাকলে স্পষ্টভাবে বলো যে পাওয়া যায়নি। কোনো তথ্য বানাবে না। কবিতা সাজেস্ট করতে বললে পাঠ্যাংশে থাকা কবিতাই সাজেস্ট করবে এবং কারণ সংক্ষেপে বলবে। উত্তরটি ১৮০ শব্দের মধ্যে রাখো। উত্তরের শেষে [১], [২]-এর মতো source number ব্যবহার করো।\n\nপ্রশ্ন: ${cleanQuestion}\n\nপাঠ্যাংশ:\n${context}`;
    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 1100,
              thinkingConfig: model.startsWith("gemini-3")
                ? { thinkingLevel: "minimal" }
                : { thinkingBudget: 0 },
            },
          }),
        },
      );
      if (response.ok) {
        const data = await response.json();
        const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("").trim();
        if (!answer) throw new Error("Empty Gemini response");
        activeModel = model;
        return Response.json({ answer, sources: sources.map(({ kind, bookId, bookTitle, sectionTitle, page }) => ({ kind, bookId, bookTitle, sectionTitle, page })) });
      }
      const errorText = (await response.text()).slice(0, 500);
      console.error("Gemini request failed", model, response.status, errorText);
      if (response.status === 429) {
        const retrySeconds = Number(errorText.match(/retry in\s+([\d.]+)s/iu)?.[1] ?? 60);
        exhaustedModels.set(model, Date.now() + Math.max(1, retrySeconds) * 1000);
        if (activeModel === model) activeModel = null;
        continue;
      }
      if (response.status === 404) {
        cachedModels = cachedModels?.filter((candidate) => candidate !== model) ?? null;
        if (activeModel === model) activeModel = null;
        continue;
      }
      return Response.json({ error: "এখন উত্তর তৈরি করা যাচ্ছে না। পরে আবার চেষ্টা করুন।" }, { status: 502 });
    }
    return Response.json({ error: "আজকের জন্য AI সহকারীর প্রশ্নসীমা শেষ হয়েছে। পরে আবার চেষ্টা করুন।" }, { status: 429 });
  } catch (error) {
    console.error("Library assistant error", error);
    return Response.json({ error: "প্রশ্নটি বোঝা যায়নি। আবার চেষ্টা করুন।" }, { status: 500 });
  }
}
