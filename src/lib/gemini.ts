import { GoogleGenerativeAI } from "@google/generative-ai";
import type { WordResult } from "@/lib/types";

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
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("503") ||
    msg.includes("high demand")
  );
}

export type { WordResult };

// Ask the LLM for a batch of N candidate words. Returns an array of word strings.
export async function generateWordBatch(n: number): Promise<string[]> {
  const prompt =
    `Generate a list of ${n} interesting English words that are familiar but not everyday vocabulary. ` +
    `These words should be diverse in origin, length, and subject. ` +
    `Return ONLY a JSON array of strings like ["word1", "word2", ...]. ` +
    `No markdown, no code fences, no other text.`;

  const ai = getGenAI();
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const modelName of MODELS) {
      try {
        console.log("[gemini] generateWordBatch calling model", { model: modelName, attempt, n });
        const model = ai.getGenerativeModel({ model: modelName });
        const start = Date.now();
        const result = await model.generateContent(prompt);
        const elapsed = Date.now() - start;
        const text = result.response.text().trim();
        console.log("[gemini] generateWordBatch model succeeded", { model: modelName, attempt, elapsed });

        const cleaned = text
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        const parsed = JSON.parse(cleaned) as unknown;

        if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "string")) {
          throw new Error("Response was not a string array");
        }

        return parsed as string[];
      } catch (err) {
        lastError = err;
        console.warn("[gemini] generateWordBatch model failed", {
          model: modelName,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
        if (isRetryableError(err)) {
          continue;
        }
        // For non-retryable errors (e.g. parse errors) break the model loop
        // and retry the whole attempt with a fresh call.
        break;
      }
    }
  }

  console.error("[gemini] generateWordBatch all retries exhausted", { n, maxRetries });
  throw lastError;
}

// Given a specific word, ask the LLM for its full WordResult.
export async function enrichWord(word: string): Promise<WordResult> {
  const prompt =
    `Given the word "${word}", return a JSON object (no markdown, no backticks) with exactly these fields: ` +
    `{"word": "${word}", "pronunciation": "IPA pronunciation", "simple_pronunciation": "simplified spelled-out pronunciation", ` +
    `"definition": "concise definition", "etymology": "brief origin", "example": "a single example sentence using the word"}`;

  const ai = getGenAI();
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const modelName of MODELS) {
      try {
        console.log("[gemini] enrichWord calling model", { model: modelName, attempt, word });
        const model = ai.getGenerativeModel({ model: modelName });
        const start = Date.now();
        const result = await model.generateContent(prompt);
        const elapsed = Date.now() - start;
        const text = result.response.text().trim();
        console.log("[gemini] enrichWord model succeeded", { model: modelName, attempt, elapsed });

        const cleaned = text
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        const parsed = JSON.parse(cleaned) as WordResult;
        return parsed;
      } catch (err) {
        lastError = err;
        console.warn("[gemini] enrichWord model failed", {
          model: modelName,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
        if (isRetryableError(err)) {
          continue;
        }
        break;
      }
    }
  }

  console.error("[gemini] enrichWord all retries exhausted", { word, maxRetries });
  throw lastError;
}
