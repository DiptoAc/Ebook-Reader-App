import { retrieveLibraryContext } from "../../../lib/book-rag";

export const runtime = "nodejs";

const REQUEST_WINDOW_MS = 10 * 60 * 1000;
const REQUEST_LIMIT = 12;
const visits = new Map();
let cachedModel = null;
let modelLookup = null;

async function availableGeminiModel(apiKey) {
  if (cachedModel) return cachedModel;
  if (!modelLookup) {
    modelLookup = (async () => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      );
      if (!response.ok) throw new Error("Unable to list Gemini models");
      const { models = [] } = await response.json();
      const preferredModels = [
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-flash-latest",
        "gemini-3-flash-preview",
      ];
      const supported = new Set(
        models
          .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
          .map((model) => model.name?.replace(/^models\//u, "")),
      );
      const selected = preferredModels.find((model) => supported.has(model)) ??
        [...supported].find((model) => model.includes("flash"));
      if (!selected) throw new Error("No compatible Gemini text model is available");
      cachedModel = selected;
      return selected;
    })().catch((error) => {
      modelLookup = null;
      throw error;
    });
  }
  return modelLookup;
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
    const sources = retrieveLibraryContext(cleanQuestion);
    if (!sources.length) {
      return Response.json({
        answer: "এই পাঠাগারের বইগুলোতে প্রশ্নটির সঙ্গে মিল পাওয়া যায়নি। অন্যভাবে লিখে চেষ্টা করুন।",
        sources: [],
      });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "লাইব্রেরি সহকারীটি এখনও প্রস্তুত করা হচ্ছে।" }, { status: 503 });
    }
    const context = sources.map((source, index) => (
      `[${index + 1}] বই: ${source.bookTitle}\nবিভাগ: ${source.sectionTitle}\nপৃষ্ঠা: ${source.page + 1}\nপাঠ্য:\n${source.text}`
    )).join("\n\n");
    const model = await availableGeminiModel(apiKey);
    const prompt = `তুমি প্রণব আচার্য্যের ডিজিটাল পাঠাগারের সহকারী। শুধু নিচে দেওয়া পাঠ্যাংশের ভিত্তিতে শুদ্ধ, সহজ বাংলায় উত্তর দাও। পাঠ্যাংশে উত্তর না থাকলে স্পষ্টভাবে বলো যে পাওয়া যায়নি। কোনো তথ্য বানাবে না। কবিতা সাজেস্ট করতে বললে পাঠ্যাংশে থাকা কবিতাই সাজেস্ট করবে এবং কারণ সংক্ষেপে বলবে। উত্তরটি ১৮০ শব্দের মধ্যে রাখো। উত্তরের শেষে [১], [২]-এর মতো source number ব্যবহার করো।\n\nপ্রশ্ন: ${cleanQuestion}\n\nপাঠ্যাংশ:\n${context}`;
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
    if (!response.ok) {
      console.error("Gemini request failed", response.status, (await response.text()).slice(0, 500));
      if (response.status === 404) cachedModel = null;
      return Response.json({ error: "এখন উত্তর তৈরি করা যাচ্ছে না। পরে আবার চেষ্টা করুন।" }, { status: 502 });
    }
    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("").trim();
    if (!answer) throw new Error("Empty Gemini response");
    return Response.json({ answer, sources: sources.map(({ bookId, bookTitle, sectionTitle, page }) => ({ bookId, bookTitle, sectionTitle, page })) });
  } catch (error) {
    console.error("Library assistant error", error);
    return Response.json({ error: "প্রশ্নটি বোঝা যায়নি। আবার চেষ্টা করুন।" }, { status: 500 });
  }
}
