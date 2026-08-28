import { describe, it, expect } from "vitest";
import {
  buildDeck,
  buildPrompts,
  dealGame,
  evaluateMatch,
  applyCorrectMatch,
  targetFor,
  pickMode,
  shuffle,
  MAX_ACTIVE,
  type MatchEntry,
  type Prompt,
} from "@/lib/matching-game";
import type { HistoryEntry } from "@/lib/types";

const DEFINITION_ONLY: ["definition"] = ["definition"];

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
    synonyms: [],
    antonyms: [],
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

describe("pickMode", () => {
  const e: MatchEntry = {
    id: "a",
    word: "Alpha",
    definition: "first letter",
    synonyms: ["beginning"],
    antonyms: ["end"],
    mode: "definition",
  };

  it("returns null when the entry has no data for any selected mode", () => {
    expect(pickMode({ definition: "", synonyms: [], antonyms: [] }, ["definition", "synonyms"])).toBeNull();
  });

  it("returns the only available mode", () => {
    expect(pickMode(e, ["synonyms"])).toBe("synonyms");
  });

  it("picks one of the selected modes the entry has data for", () => {
    const mode = pickMode(e, ["definition", "synonyms", "antonyms"]);
    expect(["definition", "synonyms", "antonyms"]).toContain(mode);
  });
});

describe("targetFor", () => {
  const e: MatchEntry = {
    id: "a",
    word: "Alpha",
    definition: "first letter",
    synonyms: ["beginning", "start", "start"],
    antonyms: ["end", " "],
    mode: "definition",
  };

  it("builds a single target card from the definition", () => {
    expect(targetFor(e, "definition")).toEqual({
      key: "a:target",
      entryId: "a",
      value: "first letter",
    });
  });

  it("joins the whole synonym array into one card, deduped", () => {
    expect(targetFor(e, "synonyms")).toEqual({
      key: "a:target",
      entryId: "a",
      value: "beginning, start",
    });
  });

  it("joins the antonym array, dropping blanks", () => {
    expect(targetFor(e, "antonyms")).toEqual({
      key: "a:target",
      entryId: "a",
      value: "end",
    });
  });

  it("returns null when the entry lacks data for that mode", () => {
    expect(targetFor({ ...e, synonyms: [] }, "synonyms")).toBeNull();
    expect(targetFor({ ...e, definition: "" }, "definition")).toBeNull();
  });
});

describe("buildDeck", () => {
  it("keeps entries that have a target for the selected modes, with a mode assigned", () => {
    const deck = buildDeck([entry("a", "Alpha"), entry("b", "Beta")], DEFINITION_ONLY);
    expect(deck).toEqual([
      expect.objectContaining({ id: "a", word: "Alpha", mode: "definition" }),
      expect.objectContaining({ id: "b", word: "Beta", mode: "definition" }),
    ]);
  });

  it("drops entries with no matchable data under the selected modes", () => {
    const noDef = { ...entry("a", "Alpha"), definition: "" };
    const withSyn = { ...entry("b", "Beta"), definition: "", synonyms: ["gamma"] };
    expect(buildDeck([noDef], ["definition"])).toHaveLength(0);
    expect(buildDeck([noDef], ["synonyms"])).toHaveLength(0);
    expect(buildDeck([withSyn], DEFINITION_ONLY)).toHaveLength(0);
    expect(buildDeck([withSyn], ["synonyms"])).toHaveLength(1);
  });

  it("assigns each kept entry a mode from the selected set it has data for", () => {
    const withBoth = { ...entry("a", "Alpha"), synonyms: ["gamma"] };
    const deck = buildDeck([withBoth], ["definition", "synonyms"]);
    expect(deck[0].mode === "definition" || deck[0].mode === "synonyms").toBe(true);
  });

  it("dedupes words case-insensitively, keeping the first", () => {
    const deck = buildDeck(
      [entry("a", "Serendipity"), entry("b", "serendipity")],
      DEFINITION_ONLY
    );
    expect(deck.map((e) => e.id)).toEqual(["a"]);
  });
});

describe("buildPrompts", () => {
  it("produces one shuffled target card per active entry, using its assigned mode", () => {
    const active: MatchEntry[] = [
      {
        id: "a",
        word: "Alpha",
        definition: "first",
        synonyms: ["s1"],
        antonyms: [],
        mode: "definition",
      },
      {
        id: "b",
        word: "Beta",
        definition: "second",
        synonyms: [],
        antonyms: [],
        mode: "definition",
      },
    ];
    const prompts = buildPrompts(active);
    expect(prompts.map((p) => p.key).sort()).toEqual(["a:target", "b:target"]);
    expect(prompts).toHaveLength(2);
    expect(prompts.every((p) => active.some((e) => e.id === p.entryId))).toBe(true);
  });

  it("omits entries whose assigned mode has no data", () => {
    const active: MatchEntry[] = [
      {
        id: "a",
        word: "Alpha",
        definition: "first",
        synonyms: [],
        antonyms: [],
        mode: "synonyms",
      },
    ];
    expect(buildPrompts(active)).toHaveLength(0);
  });
});

describe("dealGame", () => {
  it("deals up to MAX_ACTIVE entries and queues the rest", () => {
    const deck = buildDeck(Array.from({ length: 9 }, (_, i) => entry(`e${i}`, `Word${i}`)), DEFINITION_ONLY);
    const { active, queue, wordOrder } = dealGame(deck);
    expect(active).toHaveLength(MAX_ACTIVE);
    expect(queue).toHaveLength(4);
    expect([...wordOrder].sort()).toEqual(active.map((e) => e.id).sort());
  });

  it("deals fewer than MAX_ACTIVE when deck is smaller", () => {
    const deck = buildDeck([entry("a", "Alpha"), entry("b", "Beta")], DEFINITION_ONLY);
    const { active, queue } = dealGame(deck);
    expect(active).toHaveLength(2);
    expect(queue).toHaveLength(0);
  });
});

describe("evaluateMatch", () => {
  const prompts: Prompt[] = [
    { key: "a:target", entryId: "a", value: "first" },
    { key: "b:target", entryId: "b", value: "second" },
  ];

  it("is correct when the prompt belongs to the word", () => {
    expect(evaluateMatch(prompts, "a", "a:target")).toBe(true);
  });

  it("is incorrect when the prompt belongs to a different word", () => {
    expect(evaluateMatch(prompts, "a", "b:target")).toBe(false);
  });

  it("is false for unknown prompts", () => {
    expect(evaluateMatch(prompts, "a", "nope")).toBe(false);
  });
});

describe("applyCorrectMatch", () => {
  it("removes the matched entry and keeps the rest", () => {
    const active = buildDeck([entry("a", "Alpha"), entry("b", "Beta")], DEFINITION_ONLY);
    const res = applyCorrectMatch(active, [], "a");
    expect(res.active.map((e) => e.id)).toEqual(["b"]);
    expect(res.added).toEqual([]);
  });

  it("holds refill until at least two slots are empty", () => {
    const active = buildDeck(
      [
        entry("a", "Alpha"),
        entry("b", "Beta"),
        entry("c", "Gamma"),
        entry("d", "Delta"),
        entry("e", "Epsilon"),
      ],
      DEFINITION_ONLY
    );
    const queue = buildDeck([entry("f", "Zeta")], DEFINITION_ONLY);

    const first = applyCorrectMatch(active, queue, "a");
    expect(first.active).toHaveLength(4);
    expect(first.added).toEqual([]);
    expect(first.queue).toHaveLength(1);

    const second = applyCorrectMatch(first.active, first.queue, "b");
    expect(second.active).toHaveLength(4);
    expect(second.added).toEqual([expect.objectContaining({ id: "f" })]);
    expect(second.queue).toHaveLength(0);
  });

  it("refills with two queued entries at once", () => {
    const active = buildDeck(
      [
        entry("a", "Alpha"),
        entry("b", "Beta"),
        entry("c", "Gamma"),
        entry("d", "Delta"),
        entry("e", "Epsilon"),
      ],
      DEFINITION_ONLY
    );
    const queue = buildDeck([entry("f", "Zeta"), entry("g", "Eta")], DEFINITION_ONLY);

    const first = applyCorrectMatch(active, queue, "a");
    expect(first.added).toEqual([]);

    const second = applyCorrectMatch(first.active, first.queue, "b");
    expect(second.added).toHaveLength(2);
    expect(second.active).toHaveLength(5);
    expect(second.queue).toHaveLength(0);
  });

  it("shrinks the board when the queue is empty", () => {
    const active = buildDeck(
      [
        entry("a", "Alpha"),
        entry("b", "Beta"),
        entry("c", "Gamma"),
        entry("d", "Delta"),
        entry("e", "Epsilon"),
      ],
      DEFINITION_ONLY
    );
    const res = applyCorrectMatch(active, [], "a");
    expect(res.active).toHaveLength(4);
  });
});
