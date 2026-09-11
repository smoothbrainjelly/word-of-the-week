import { describe, it, expect } from "vitest";
import {
  buildHangmanDeck,
  wordLetters,
  maskWord,
  isWordSolved,
  wrongGuesses,
  HANGMAN_MAX_WRONG,
} from "@/lib/hangman";
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
    synonyms: [],
    antonyms: [],
    sentAt: "2026-01-01T00:00:00.000Z",
    recipientCount: 1,
  };
}

describe("buildHangmanDeck", () => {
  it("builds one round per entry that has data for the mode", () => {
    const deck = buildHangmanDeck([entry("a", "Alpha"), entry("b", "Beta")], "definition");
    expect(deck).toHaveLength(2);
    expect(deck.map((r) => r.word).sort()).toEqual(["Alpha", "Beta"]);
    expect(deck.every((r) => r.clue === `def-${r.word}`)).toBe(true);
  });

  it("drops entries without data for the selected mode", () => {
    const noDef = { ...entry("a", "Alpha"), definition: "" };
    expect(buildHangmanDeck([noDef], "definition")).toHaveLength(0);
  });

  it("uses synonyms as the clue when that mode is selected", () => {
    const withSyn = { ...entry("a", "Alpha"), synonyms: ["beginning", "start"] };
    const deck = buildHangmanDeck([withSyn], "synonyms");
    expect(deck).toHaveLength(1);
    expect(deck[0].clue).toBe("beginning, start");
  });
});

describe("wordLetters", () => {
  it("returns unique uppercase letters in order of appearance", () => {
    expect(wordLetters("banana")).toEqual(["B", "A", "N"]);
  });

  it("ignores non-letter characters", () => {
    expect(wordLetters("wait-up!")).toEqual(["W", "A", "I", "T", "U", "P"]);
  });
});

describe("maskWord", () => {
  it("masks unguessed letters and reveals guessed ones", () => {
    expect(maskWord("cat", new Set(["A"]))).toEqual(["_", "A", "_"]);
  });

  it("reveals non-letter characters as-is", () => {
    expect(maskWord("hi-fi", new Set())).toEqual(["_", "_", "-", "_", "_"]);
  });

  it("is case-insensitive", () => {
    expect(maskWord("hello", new Set(["H"]))).toEqual(["H", "_", "_", "_", "_"]);
  });
});

describe("isWordSolved", () => {
  it("is true when all letters are guessed", () => {
    expect(isWordSolved("cat", new Set(["C", "A", "T"]))).toBe(true);
  });

  it("is false when letters remain", () => {
    expect(isWordSolved("cat", new Set(["C", "A"]))).toBe(false);
  });
});

describe("wrongGuesses", () => {
  it("returns guessed letters not in the word, sorted", () => {
    expect(wrongGuesses("cat", new Set(["C", "X", "Z", "A"]))).toEqual(["X", "Z"]);
  });

  it("is empty when all guesses are correct", () => {
    expect(wrongGuesses("cat", new Set(["C", "A", "T"]))).toEqual([]);
  });
});

describe("constants", () => {
  it("has a positive max wrong guesses", () => {
    expect(HANGMAN_MAX_WRONG).toBeGreaterThan(0);
  });
});
