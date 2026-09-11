import type { HistoryEntry } from "@/lib/types";
import { buildDeck, shuffle, targetFor, type MatchMode } from "@/lib/matching-game";

export const HANGMAN_MAX_WRONG = 6;
export const HANGMAN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export type HangmanRound = {
  id: string;
  word: string;
  clue: string;
};

export function buildHangmanDeck(entries: HistoryEntry[], mode: MatchMode): HangmanRound[] {
  const rounds: HangmanRound[] = [];
  for (const e of buildDeck(entries, [mode])) {
    const target = targetFor(e, e.mode);
    if (!target) continue;
    rounds.push({ id: e.id, word: e.word, clue: target.value });
  }
  return shuffle(rounds);
}

export function wordLetters(word: string): string[] {
  const upper = word.trim().toUpperCase();
  return [...new Set(upper.split("").filter((ch) => /[A-Z]/.test(ch)))];
}

export function maskWord(word: string, guessed: ReadonlySet<string>): string[] {
  const upper = word.trim().toUpperCase();
  return upper.split("").map((ch) => {
    if (/[A-Z]/.test(ch) && !guessed.has(ch)) return "_";
    return ch;
  });
}

export function isWordSolved(word: string, guessed: ReadonlySet<string>): boolean {
  return wordLetters(word).every((ch) => guessed.has(ch));
}

export function wrongGuesses(word: string, guessed: ReadonlySet<string>): string[] {
  const letters = new Set(wordLetters(word));
  return [...guessed].filter((g) => !letters.has(g)).sort();
}
