import { redis } from "@/lib/redis";

const WORD_POOL_KEY = "word_pool";
const USED_WORDS_KEY = "used_words";

// Returns current pool size (number of available words).
export async function getPoolSize(): Promise<number> {
  try {
    return await redis.scard(WORD_POOL_KEY);
  } catch (err) {
    console.warn("[word-pool] getPoolSize failed", err instanceof Error ? err.message : String(err));
    return 0;
  }
}

// Atomically removes and returns a random word from the pool.
// Returns null if the pool is empty.
export async function getAvailableWord(): Promise<string | null> {
  try {
    const word = await redis.spop<string>(WORD_POOL_KEY);
    return word ?? null;
  } catch (err) {
    console.warn("[word-pool] getAvailableWord failed", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Returns a random word from the pool WITHOUT removing it.
// Returns null if the pool is empty.
export async function previewWord(): Promise<string | null> {
  try {
    const word = await redis.srandmember<string>(WORD_POOL_KEY);
    return word ?? null;
  } catch (err) {
    console.warn("[word-pool] previewWord failed", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Adds a word to the used_words set (lowercased).
export async function addUsedWord(word: string): Promise<void> {
  try {
    await redis.sadd(USED_WORDS_KEY, word.toLowerCase());
  } catch (err) {
    console.warn("[word-pool] addUsedWord failed", err instanceof Error ? err.message : String(err));
  }
}

// Removes a word from the pool (e.g., after manual send).
export async function removeFromPool(word: string): Promise<void> {
  try {
    await redis.srem(WORD_POOL_KEY, word.toLowerCase());
  } catch (err) {
    console.warn("[word-pool] removeFromPool failed", err instanceof Error ? err.message : String(err));
  }
}

// Filters candidates against word_pool and used_words, then adds remaining
// candidates to word_pool. Returns stats about how many were added vs total.
export async function addToPool(candidates: string[]): Promise<{ added: number; total: number }> {
  if (candidates.length === 0) {
    return { added: 0, total: 0 };
  }

  const newWords: string[] = [];

  for (const candidate of candidates) {
    const word = candidate.toLowerCase();
    try {
      const inPool = await redis.sismember(WORD_POOL_KEY, word);
      if (inPool) continue;
      const isUsed = await redis.sismember(USED_WORDS_KEY, word);
      if (isUsed) continue;
      newWords.push(word);
    } catch (err) {
      console.warn("[word-pool] addToPool filter failed for word", word, err instanceof Error ? err.message : String(err));
    }
  }

  let added = 0;
  if (newWords.length > 0) {
    try {
      added = await redis.sadd(WORD_POOL_KEY, newWords[0]!, ...newWords.slice(1));
    } catch (err) {
      console.warn("[word-pool] addToPool SADD failed", err instanceof Error ? err.message : String(err));
    }
  }

  return { added, total: candidates.length };
}

// Full refill: generates a batch of candidate words via the LLM, then adds
// them to the pool. Returns stats.
export async function refillPool(): Promise<{ added: number; total: number }> {
  const { generateWordBatch } = await import("./gemini");
  const candidates = await generateWordBatch(500);
  return addToPool(candidates);
}
