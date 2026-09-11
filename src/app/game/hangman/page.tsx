"use client";

import { useCallback, useEffect, useState } from "react";
import type { HistoryEntry } from "@/lib/types";
import type { MatchMode } from "@/lib/matching-game";
import {
  HANGMAN_ALPHABET,
  HANGMAN_MAX_WRONG,
  buildHangmanDeck,
  isWordSolved,
  maskWord,
  wrongGuesses,
  type HangmanRound,
} from "@/lib/hangman";

const MODE_OPTIONS: { value: MatchMode; label: string }[] = [
  { value: "definition", label: "Definitions" },
  { value: "synonyms", label: "Synonyms" },
  { value: "antonyms", label: "Antonyms" },
];

const CLUE_LABEL: Record<MatchMode, string> = {
  definition: "Definition",
  synonyms: "Synonyms",
  antonyms: "Antonyms",
};

const DEFAULT_MODE: MatchMode = "definition";

type Outcome = "playing" | "won" | "lost";

function HangmanFigure({ wrong }: { wrong: number }) {
  return (
    <svg
      viewBox="0 0 200 250"
      className="w-40 h-auto text-zinc-700"
      stroke="currentColor"
      fill="none"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="20" y1="240" x2="180" y2="240" />
      <line x1="50" y1="240" x2="50" y2="20" />
      <line x1="50" y1="20" x2="150" y2="20" />
      <line x1="150" y1="20" x2="150" y2="50" />
      {wrong >= 1 && <circle cx="150" cy="70" r="20" />}
      {wrong >= 2 && <line x1="150" y1="90" x2="150" y2="160" />}
      {wrong >= 3 && <line x1="150" y1="110" x2="120" y2="135" />}
      {wrong >= 4 && <line x1="150" y1="110" x2="180" y2="135" />}
      {wrong >= 5 && <line x1="150" y1="160" x2="120" y2="200" />}
      {wrong >= 6 && <line x1="150" y1="160" x2="180" y2="200" />}
    </svg>
  );
}

export default function HangmanPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [mode, setMode] = useState<MatchMode>(DEFAULT_MODE);
  const [deck, setDeck] = useState<HangmanRound[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [guessed, setGuessed] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Outcome>("playing");
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");

  const round = deck[roundIndex];
  const wrong = round ? wrongGuesses(round.word, new Set(guessed)) : [];

  function startGame(entries: HistoryEntry[], nextMode: MatchMode) {
    const nextDeck = buildHangmanDeck(entries, nextMode);
    if (nextDeck.length === 0) {
      setStatus("empty");
      return;
    }
    setDeck(nextDeck);
    setRoundIndex(0);
    setGuessed([]);
    setOutcome("playing");
    setStatus("ready");
  }

  useEffect(() => {
    fetch("/api/game")
      .then((r) => r.json())
      .then((d) => {
        const entries = (d.entries ?? []) as HistoryEntry[];
        setHistory(entries);
        startGame(entries, DEFAULT_MODE);
      })
      .catch(() => setStatus("empty"));
  }, []);

  function toggleMode(nextMode: MatchMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    startGame(history, nextMode);
  }

  const handleGuess = useCallback(
    (letter: string) => {
      if (outcome !== "playing" || !round) return;
      if (guessed.includes(letter)) return;
      const next = [...guessed, letter];
      setGuessed(next);
      const guessSet = new Set(next);
      if (isWordSolved(round.word, guessSet)) {
        setOutcome("won");
      } else if (wrongGuesses(round.word, guessSet).length >= HANGMAN_MAX_WRONG) {
        setOutcome("lost");
      }
    },
    [outcome, round, guessed]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const letter = e.key.toUpperCase();
      if (/^[A-Z]$/.test(letter)) handleGuess(letter);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleGuess]);

  function nextWord() {
    setRoundIndex((i) => (i + 1) % deck.length);
    setGuessed([]);
    setOutcome("playing");
  }

  return (
    <div className="mx-auto p-10 space-y-8" style={{ maxWidth: 1200 }}>
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Hangman</h1>
        <p className="text-sm text-zinc-500">
          Guess the word letter by letter using the clue below. Six wrong guesses and you&apos;re
          out.
        </p>
        <div className="flex items-center gap-3">
          {MODE_OPTIONS.map(({ value, label }) => {
            const on = mode === value;
            return (
              <button
                key={value}
                onClick={() => toggleMode(value)}
                aria-pressed={on}
                className={`px-3 py-1.5 border rounded-full text-sm font-medium transition-colors ${
                  on
                    ? "bg-zinc-800 text-white border-zinc-800"
                    : "border-zinc-300 text-zinc-600 hover:border-zinc-400"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {status === "loading" && <p className="text-zinc-500">Loading…</p>}

      {status === "empty" && (
        <p className="text-zinc-500">
          No words have been sent yet, or none have data for the selected clue type yet — the pool
          fills up as words are sent.
        </p>
      )}

      {status === "ready" && round && (
        <div className="space-y-8">
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>
              Word {roundIndex + 1} of {deck.length}
            </span>
            <span>
              Guesses left: {HANGMAN_MAX_WRONG - wrong.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                {CLUE_LABEL[mode]}
              </h2>
              <div className="border rounded-lg p-4 bg-zinc-50 text-sm min-h-24">
                {round.clue}
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <HangmanFigure wrong={wrong.length} />
              <div className="flex flex-wrap gap-2 justify-center">
                {maskWord(round.word, new Set(guessed)).map((ch, i) => (
                  <span
                    key={`${round.id}-${i}`}
                    className={`w-10 h-12 flex items-center justify-center border rounded-md text-2xl font-mono font-bold ${
                      ch === "_"
                        ? "border-zinc-300 bg-zinc-50"
                        : "border-zinc-700 bg-white"
                    }`}
                  >
                    {ch === "_" ? "" : ch}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {(outcome === "won" || outcome === "lost") && (
            <div
              className={`border rounded-lg p-6 text-center space-y-4 ${
                outcome === "won"
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <p
                className={`font-semibold ${
                  outcome === "won" ? "text-green-700" : "text-red-700"
                }`}
              >
                {outcome === "won"
                  ? `Correct — the word was ${round.word}!`
                  : `Out of guesses — the word was ${round.word}.`}
              </p>
              <button
                onClick={nextWord}
                className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Next word
              </button>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 max-w-lg">
              {HANGMAN_ALPHABET.map((letter) => {
                const used = guessed.includes(letter);
                const inWord = round.word.toUpperCase().includes(letter);
                return (
                  <button
                    key={letter}
                    onClick={() => handleGuess(letter)}
                    disabled={used || outcome !== "playing"}
                    className={`w-9 h-9 rounded-md border text-sm font-medium transition-colors ${
                      used
                        ? inWord
                          ? "bg-green-50 border-green-200 text-green-700"
                          : "bg-red-50 border-red-200 text-red-300 line-through"
                        : "border-zinc-300 text-zinc-700 hover:border-zinc-500 disabled:opacity-40 disabled:hover:border-zinc-300"
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-400">
              Tip: you can also type letters on your keyboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
