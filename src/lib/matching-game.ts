import type { HistoryEntry } from "@/lib/types";

export type MatchEntry = {
  id: string;
  word: string;
  definition: string;
};

export const MAX_ACTIVE = 5;
export const REFILL_MIN_EMPTY = 2;

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildDeck(entries: HistoryEntry[]): MatchEntry[] {
  const seen = new Set<string>();
  const deck: MatchEntry[] = [];
  for (const e of entries) {
    const key = e.word.trim().toLowerCase();
    if (!key || !e.definition?.trim()) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    deck.push({ id: e.id, word: e.word, definition: e.definition });
  }
  return deck;
}

export function dealGame(deck: MatchEntry[]): {
  active: MatchEntry[];
  queue: MatchEntry[];
  wordOrder: string[];
  defOrder: string[];
} {
  const active = deck.slice(0, MAX_ACTIVE);
  return {
    active,
    queue: deck.slice(MAX_ACTIVE),
    wordOrder: shuffle(active.map((e) => e.id)),
    defOrder: shuffle(active.map((e) => e.id)),
  };
}

export function evaluateMatch(active: MatchEntry[], wordId: string, defId: string): boolean {
  const word = active.find((e) => e.id === wordId);
  const def = active.find((e) => e.id === defId);
  return !!word && !!def && word.id === def.id;
}

export function applyCorrectMatch(
  active: MatchEntry[],
  queue: MatchEntry[],
  matchedId: string
): { active: MatchEntry[]; queue: MatchEntry[]; added: MatchEntry[] } {
  const withoutMatched = active.filter((e) => e.id !== matchedId);
  const emptySlots = MAX_ACTIVE - withoutMatched.length;
  let added: MatchEntry[] = [];
  let nextQueue = queue;
  if (emptySlots >= REFILL_MIN_EMPTY && nextQueue.length > 0) {
    const take = Math.min(emptySlots, nextQueue.length);
    added = nextQueue.slice(0, take);
    nextQueue = nextQueue.slice(take);
  }
  return { active: [...withoutMatched, ...added], queue: nextQueue, added };
}
