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

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("503") || msg.includes("high demand");
}

type WordResult = {
  word: string;
  pronunciation: string;
  simple_pronunciation: string;
  definition: string;
  etymology: string;
  example: string;
};

export async function generateWord(theme: string, avoidWords: Set<string> = new Set()): Promise<WordResult> {
  const maxRetries = avoidWords.size > 0 ? 6 : 3;

  function buildPrompt(attempt: number): string {
    const p = `You are a "Word of the Week" generator. Given this theme: "${theme}", pick a fitting word and return JSON (no markdown, no backticks) with:
{
  "word": "the word",
  "pronunciation": "phonetic pronunciation in IPA (e.g., /ˈsɜːr.tən/)",
  "simple_pronunciation": "simplified spelled-out pronunciation (e.g., SUR-tn)",
  "definition": "concise definition",
  "etymology": "brief origin of the word",
  "example": "a single example sentence using the word"
}`;

    if (avoidWords.size > 0) {
      const list = [...avoidWords].join(", ");
      if (attempt >= 3) {
        return `${p}\n\nBLOCKED WORDS (${avoidWords.size}): ${list}. DO NOT use ANY of these. Pick something completely new.`;
      }
      if (attempt >= 2) {
        return `${p}\n\nWARNING: All of these words have already been used: ${list}. You MUST NOT repeat them. Pick a different word entirely.`;
      }
      return `${p}\n\nIMPORTANT: Do NOT pick any of these already-used words: ${list}. Choose a completely different word.`;
    }
    return p;
  }

  const ai = getGenAI();
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const prompt = buildPrompt(attempt);
    let collisionDetected = false;

    for (const modelName of MODELS) {
      try {
        console.log("[gemini] Calling model", { model: modelName, attempt });
        const model = ai.getGenerativeModel({ model: modelName });
        const start = Date.now();
        const result = await model.generateContent(prompt);
        const elapsed = Date.now() - start;
        const text = result.response.text().trim();
        console.log("[gemini] Model succeeded", { model: modelName, attempt, elapsed });
        const cleaned = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
        const parsed = JSON.parse(cleaned) as WordResult;

        if (avoidWords.has(parsed.word.toLowerCase())) {
          console.warn("[gemini] Word collision detected", { word: parsed.word, attempt });
          lastError = new Error(`Word "${parsed.word}" is already used`);
          collisionDetected = true;
          break;
        }

        return parsed;
      } catch (err) {
        lastError = err;
        console.warn("[gemini] Model failed", { model: modelName, attempt, error: err instanceof Error ? err.message : String(err) });
        if (isRetryableError(err)) {
          continue;
        }
        if (err instanceof Error && err.message.includes("already used")) {
          break;
        }
        throw err;
      }
    }

    if (!collisionDetected) {
      break;
    }
  }

  console.error("[gemini] All retries exhausted", { maxRetries, avoidWordsCount: avoidWords.size });
  throw lastError;
}
