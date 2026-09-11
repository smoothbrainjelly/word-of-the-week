import { redis } from "@/lib/redis";
import { addToPool } from "@/lib/word-pool";

export const SUBMISSIONS_KEY = "word_submissions";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type WordSubmission = {
  id: string;
  word: string;
  submittedBy: string;
  submittedById: string;
  submittedAt: string;
  status: SubmissionStatus;
  handledAt?: string;
  handledBy?: string;
};

function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function listSubmissions(status?: SubmissionStatus): Promise<WordSubmission[]> {
  try {
    const all = (await redis.get<WordSubmission[]>(SUBMISSIONS_KEY)) ?? [];
    return status ? all.filter((s) => s.status === status) : all;
  } catch (err) {
    console.warn("[word-submissions] listSubmissions failed", err instanceof Error ? err.message : String(err));
    return [];
  }
}

export async function isWordTaken(
  word: string,
  exceptId?: string
): Promise<{ taken: boolean; reason: string | null }> {
  const w = normalizeWord(word);
  try {
    if (await redis.sismember("word_pool", w)) {
      return { taken: true, reason: "This word is already in the word pool." };
    }
    if (await redis.sismember("used_words", w)) {
      return { taken: true, reason: "This word has already been used." };
    }
    const submissions = (await redis.get<WordSubmission[]>(SUBMISSIONS_KEY)) ?? [];
    const pending = submissions.find(
      (s) => s.status === "pending" && s.id !== exceptId && normalizeWord(s.word) === w
    );
    if (pending) {
      return { taken: true, reason: "This word is already pending review." };
    }
    return { taken: false, reason: null };
  } catch (err) {
    console.warn("[word-submissions] isWordTaken failed", err instanceof Error ? err.message : String(err));
    return { taken: true, reason: "Could not verify word availability. Please try again." };
  }
}

export async function submitWord(
  word: string,
  submittedBy: string,
  submittedById: string
): Promise<{ ok: true; submission: WordSubmission } | { ok: false; error: string }> {
  const w = normalizeWord(word);
  if (!w) {
    return { ok: false, error: "Word is required." };
  }
  if (!/^[a-z]+(?:['-][a-z]+)*$/.test(w)) {
    return { ok: false, error: "Word can only contain letters, hyphens, and apostrophes." };
  }
  if (w.length > 45) {
    return { ok: false, error: "Word is too long (max 45 characters)." };
  }

  const availability = await isWordTaken(w);
  if (availability.taken) {
    return { ok: false, error: availability.reason ?? "This word is already taken." };
  }

  const submission: WordSubmission = {
    id: crypto.randomUUID(),
    word: w,
    submittedBy,
    submittedById,
    submittedAt: new Date().toISOString(),
    status: "pending",
  };

  try {
    const all = (await redis.get<WordSubmission[]>(SUBMISSIONS_KEY)) ?? [];
    all.push(submission);
    await redis.set(SUBMISSIONS_KEY, all);
    return { ok: true, submission };
  } catch (err) {
    console.warn("[word-submissions] submitWord failed", err instanceof Error ? err.message : String(err));
    return { ok: false, error: "Could not save submission. Please try again." };
  }
}

export async function approveSubmission(
  id: string,
  handledBy: string
): Promise<{ ok: true; submission: WordSubmission } | { ok: false; error: string }> {
  try {
    const all = (await redis.get<WordSubmission[]>(SUBMISSIONS_KEY)) ?? [];
    const idx = all.findIndex((s) => s.id === id && s.status === "pending");
    if (idx === -1) {
      return { ok: false, error: "Pending submission not found." };
    }

    const availability = await isWordTaken(all[idx].word, all[idx].id);
    if (availability.taken) {
      return { ok: false, error: availability.reason ?? "This word is no longer available." };
    }

    const added = await addToPool([all[idx].word]);
    if (added.added === 0) {
      return { ok: false, error: "Could not add word to the pool. Try again." };
    }

    all[idx].status = "approved";
    all[idx].handledAt = new Date().toISOString();
    all[idx].handledBy = handledBy;
    await redis.set(SUBMISSIONS_KEY, all);
    return { ok: true, submission: all[idx] };
  } catch (err) {
    console.warn("[word-submissions] approveSubmission failed", err instanceof Error ? err.message : String(err));
    return { ok: false, error: "Approval failed. Please try again." };
  }
}

export async function rejectSubmission(
  id: string,
  handledBy: string
): Promise<{ ok: true; submission: WordSubmission } | { ok: false; error: string }> {
  try {
    const all = (await redis.get<WordSubmission[]>(SUBMISSIONS_KEY)) ?? [];
    const idx = all.findIndex((s) => s.id === id && s.status === "pending");
    if (idx === -1) {
      return { ok: false, error: "Pending submission not found." };
    }

    all[idx].status = "rejected";
    all[idx].handledAt = new Date().toISOString();
    all[idx].handledBy = handledBy;
    await redis.set(SUBMISSIONS_KEY, all);
    return { ok: true, submission: all[idx] };
  } catch (err) {
    console.warn("[word-submissions] rejectSubmission failed", err instanceof Error ? err.message : String(err));
    return { ok: false, error: "Rejection failed. Please try again." };
  }
}
