import { GoogleGenerativeAI } from "@google/generative-ai";

const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
] as const;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED");
}

type WordResult = {
  word: string;
  definition: string;
  etymology: string;
  example: string;
};

export async function generateWord(theme: string): Promise<WordResult> {
  const prompt = `You are a "Word of the Week" generator. Given this theme: "${theme}", pick a fitting word and return JSON (no markdown, no backticks) with:
{
  "word": "the word",
  "definition": "concise definition",
  "etymology": "brief origin of the word",
  "example": "a single example sentence using the word"
}`;

  const ai = getGenAI();
  let lastError: unknown;

  for (const modelName of MODELS) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      return JSON.parse(cleaned) as WordResult;
    } catch (err) {
      lastError = err;
      if (isQuotaError(err)) {
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
