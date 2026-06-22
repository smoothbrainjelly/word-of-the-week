import { redis } from "@/lib/redis";
import type { HistoryEntry } from "@/lib/types";

const USED_WORDS_KEY = "used_words";

export async function getUsedWords(): Promise<Set<string>> {
  try {
    const words = await redis.smembers<string[]>(USED_WORDS_KEY);
    return new Set(words ?? []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("WRONGTYPE")) {
      console.warn("[used-words] Key has wrong type, reseeding from history");
      await redis.del(USED_WORDS_KEY);
      const history = (await redis.get<HistoryEntry[]>("history")) ?? [];
      const words = [...new Set(history.map((h) => h.word.toLowerCase()))];
      for (const w of words) {
        await redis.sadd(USED_WORDS_KEY, w);
      }
      return new Set(words);
    }
    throw err;
  }
}

export async function addUsedWord(word: string): Promise<void> {
  await redis.sadd(USED_WORDS_KEY, word.toLowerCase());
}
