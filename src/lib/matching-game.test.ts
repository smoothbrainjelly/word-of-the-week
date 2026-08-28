import { describe, it, expect } from "vitest";
import {
  buildDeck,
  dealGame,
  evaluateMatch,
  applyCorrectMatch,
  shuffle,
  MAX_ACTIVE,
  type MatchEntry,
} from "@/lib/matching-game";
import type { HistoryEntry } from "@/lib/types";

function entry(id: string, word: string, definition = `def-${word}`): HistoryEntry {
  return {
    id,
    word,
    pronunciation: "",
    simple_pronunciation: "",
    part_of_speech: "noun",
    definition,
    etymology: "",
    example: "",
    sentAt: "2026-01-01T00:00:00.000Z",
    recipientCount: 1,
  };
}

describe("shuffle", () => {
  it("returns a permutation of the input", () => {
    const arr = [1, 2, 3, 4, 5];
    const out = shuffle(arr);
    expect(out).toHaveLength(arr.length);
    expect([...out].sort()).toEqual([...arr].sort());
    expect(arr).toEqual([1, 2, 3, 4, 5]);
  });

  it("does not mutate the input", () => {
    const arr = [1, 2, 3];
    shuffle(arr);
    expect(arr).toEqual([1, 2, 3]);
  });
});

describe("buildDeck", () => {
  it("keeps entries with a word and definition", () => {
    const deck = buildDeck([entry("a", "Alpha"), entry("b", "Beta")]);
    expect(deck).toEqual([
      { id: "a", word: "Alpha", definition: "def-Alpha" },
      { id: "b", word: "Beta", definition: "def-Beta" },
    ]);
  });

  it("drops entries with missing definitions or blank words", () => {
    const deck = buildDeck([
      entry("a", "Alpha", "  "),
      entry("b", "", "has def"),
      entry("c", "  ", "has def"),
      entry("d", "Delta", "ok"),
    ]);
    expect(deck).toEqual([{ id: "d", word: "Delta", definition: "ok" }]);
  });

  it("dedupes words case-insensitively, keeping the first", () => {
    const deck = buildDeck([entry("a", "Serendipity"), entry("b", "serendipity")]);
    expect(deck).toEqual([{ id: "a", word: "Serendipity", definition: "def-Serendipity" }]);
  });
});

describe("dealGame", () => {
  it("deals up to MAX_ACTIVE entries and queues the rest", () => {
    const deck = buildDeck(Array.from({ length: 9 }, (_, i) => entry(`e${i}`, `Word${i}`)));
    const { active, queue } = dealGame(deck);
    expect(active).toHaveLength(MAX_ACTIVE);
    expect(queue).toHaveLength(4);
  });

  it("deals fewer than MAX_ACTIVE when deck is smaller", () => {
    const deck = buildDeck([entry("a", "Alpha"), entry("b", "Beta")]);
    const { active, queue } = dealGame(deck);
    expect(active).toHaveLength(2);
    expect(queue).toHaveLength(0);
  });

  it("produces shuffled orders that cover the same active set", () => {
    const deck = buildDeck(Array.from({ length: 5 }, (_, i) => entry(`e${i}`, `Word${i}`)));
    const { active, wordOrder, defOrder } = dealGame(deck);
    const activeIds = active.map((e) => e.id).sort();
    expect([...wordOrder].sort()).toEqual(activeIds);
    expect([...defOrder].sort()).toEqual(activeIds);
  });
});

describe("evaluateMatch", () => {
  it("returns true when wordId and defId reference the same entry", () => {
    const active: MatchEntry[] = [
      { id: "a", word: "Alpha", definition: "first" },
      { id: "b", word: "Beta", definition: "second" },
    ];
    expect(evaluateMatch(active, "a", "a")).toBe(true);
  });

  it("returns false for mismatched pairs", () => {
    const active: MatchEntry[] = [
      { id: "a", word: "Alpha", definition: "first" },
      { id: "b", word: "Beta", definition: "second" },
    ];
    expect(evaluateMatch(active, "a", "b")).toBe(false);
  });

  it("returns false for ids not in the active set", () => {
    const active: MatchEntry[] = [{ id: "a", word: "Alpha", definition: "first" }];
    expect(evaluateMatch(active, "a", "nope")).toBe(false);
    expect(evaluateMatch(active, "nope", "a")).toBe(false);
  });
});

describe("applyCorrectMatch", () => {
  it("removes the matched entry and keeps the rest", () => {
    const active = buildDeck([entry("a", "Alpha"), entry("b", "Beta")]);
    const res = applyCorrectMatch(active, [], "a");
    expect(res.active.map((e) => e.id)).toEqual(["b"]);
  });

  it("holds refill until at least two slots are empty", () => {
    const active = buildDeck([
      entry("a", "Alpha"),
      entry("b", "Beta"),
      entry("c", "Gamma"),
      entry("d", "Delta"),
      entry("e", "Epsilon"),
    ]);
    const queue = buildDeck([entry("f", "Zeta")]);

    const first = applyCorrectMatch(active, queue, "a");
    expect(first.active).toHaveLength(4);
    expect(first.added).toEqual([]);
    expect(first.queue).toHaveLength(1);

    const second = applyCorrectMatch(first.active, first.queue, "b");
    expect(second.active).toHaveLength(4);
    expect(second.added).toEqual([{ id: "f", word: "Zeta", definition: "def-Zeta" }]);
    expect(second.queue).toHaveLength(0);
  });

  it("refills with two queued entries at once", () => {
    const active = buildDeck([
      entry("a", "Alpha"),
      entry("b", "Beta"),
      entry("c", "Gamma"),
      entry("d", "Delta"),
      entry("e", "Epsilon"),
    ]);
    const queue = buildDeck([entry("f", "Zeta"), entry("g", "Eta")]);

    const first = applyCorrectMatch(active, queue, "a");
    expect(first.added).toEqual([]);

    const second = applyCorrectMatch(first.active, first.queue, "b");
    expect(second.added).toEqual([
      { id: "f", word: "Zeta", definition: "def-Zeta" },
      { id: "g", word: "Eta", definition: "def-Eta" },
    ]);
    expect(second.active).toHaveLength(5);
    expect(second.queue).toHaveLength(0);
  });

  it("shrinks the board when the queue is empty", () => {
    const active = buildDeck([
      entry("a", "Alpha"),
      entry("b", "Beta"),
      entry("c", "Gamma"),
      entry("d", "Delta"),
      entry("e", "Epsilon"),
    ]);
    const res = applyCorrectMatch(active, [], "a");
    expect(res.active).toHaveLength(4);
    expect(res.added).toEqual([]);
  });
});
