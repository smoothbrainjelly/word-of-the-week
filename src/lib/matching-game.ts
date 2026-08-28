import type { HistoryEntry } from "@/lib/types";

export type MatchMode = "definition" | "synonyms" | "antonyms";

export type MatchEntry = {
  id: string;
  word: string;
  definition: string;
  synonyms: string[];
  antonyms: string[];
  mode: MatchMode;
};

export type Prompt = {
  key: string;
  entryId: string;
  value: string;
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

function hasDataForMode(
  entry: Pick<MatchEntry, "definition" | "synonyms" | "antonyms">,
  mode: MatchMode
): boolean {
  if (mode === "definition") return !!entry.definition?.trim();
  if (mode === "synonyms") return (entry.synonyms ?? []).some((s) => s.trim());
  return (entry.antonyms ?? []).some((s) => s.trim());
}

const dedupe = (arr?: string[] | null) => [...new Set((arr ?? []).map((s) => s.trim()).filter(Boolean))];

export function pickMode(
  entry: Pick<MatchEntry, "definition" | "synonyms" | "antonyms">,
  modes: readonly MatchMode[]
): MatchMode | null {
  const available = modes.filter((m) => hasDataForMode(entry, m));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function targetFor(entry: MatchEntry, mode: MatchMode): Prompt | null {
  if (mode === "definition") {
    const def = entry.definition?.trim();
    return def ? { key: `${entry.id}:target`, entryId: entry.id, value: def } : null;
  }
  if (mode === "synonyms") {
    const syns = dedupe(entry.synonyms);
    return syns.length > 0 ? { key: `${entry.id}:target`, entryId: entry.id, value: syns.join(", ") } : null;
  }
  const ants = dedupe(entry.antonyms);
  return ants.length > 0 ? { key: `${entry.id}:target`, entryId: entry.id, value: ants.join(", ") } : null;
}

export function buildDeck(entries: HistoryEntry[], modes: MatchMode[]): MatchEntry[] {
  const seen = new Set<string>();
  const deck: MatchEntry[] = [];
  for (const e of entries) {
    const key = e.word.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    const entry: MatchEntry = {
      id: e.id,
      word: e.word,
      definition: e.definition ?? "",
      synonyms: e.synonyms ?? [],
      antonyms: e.antonyms ?? [],
      mode: "definition",
    };
    const mode = pickMode(entry, modes);
    if (!mode) continue;
    entry.mode = mode;
    seen.add(key);
    deck.push(entry);
  }
  return deck;
}

export function buildPrompts(active: MatchEntry[]): Prompt[] {
  const prompts = active.map((e) => targetFor(e, e.mode)).filter((p): p is Prompt => p !== null);
  return shuffle(prompts);
}

export function dealGame(deck: MatchEntry[]): {
  active: MatchEntry[];
  queue: MatchEntry[];
  wordOrder: string[];
} {
  const active = deck.slice(0, MAX_ACTIVE);
  return {
    active,
    queue: deck.slice(MAX_ACTIVE),
    wordOrder: shuffle(active.map((e) => e.id)),
  };
}

export function evaluateMatch(prompts: Prompt[], wordId: string, promptKey: string): boolean {
  const prompt = prompts.find((p) => p.key === promptKey);
  return !!prompt && prompt.entryId === wordId;
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
