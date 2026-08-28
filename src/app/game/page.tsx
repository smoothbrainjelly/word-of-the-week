"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HistoryEntry } from "@/lib/types";
import {
  buildDeck,
  dealGame,
  evaluateMatch,
  applyCorrectMatch,
  buildPrompts,
  shuffle,
  MAX_ACTIVE,
  type MatchEntry,
  type MatchMode,
  type Prompt,
} from "@/lib/matching-game";

const slots = Array.from({ length: MAX_ACTIVE }, (_, i) => i);

const MODE_OPTIONS: { value: MatchMode; label: string }[] = [
  { value: "definition", label: "Definitions" },
  { value: "synonyms", label: "Synonyms" },
  { value: "antonyms", label: "Antonyms" },
];

const DEFAULT_MODES: MatchMode[] = ["definition"];

const MODE_LABEL: Record<MatchMode, string> = {
  definition: "definitions",
  synonyms: "synonyms",
  antonyms: "antonyms",
};

export default function GamePage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");
  const [modes, setModes] = useState<MatchMode[]>(DEFAULT_MODES);
  const [active, setActive] = useState<MatchEntry[]>([]);
  const [queue, setQueue] = useState<MatchEntry[]>([]);
  const [wordOrder, setWordOrder] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selWord, setSelWord] = useState<string | null>(null);
  const [selPrompt, setSelPrompt] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [matched, setMatched] = useState<MatchEntry[]>([]);

  const tileRefs = useRef(new Map<string, HTMLButtonElement>());
  const beforeRects = useRef<Map<string, DOMRect> | null>(null);
  const moveCleanupRef = useRef<number | null>(null);

  function snapshotPositions() {
    const rects = new Map<string, DOMRect>();
    tileRefs.current.forEach((el, id) => rects.set(id, el.getBoundingClientRect()));
    beforeRects.current = rects;
  }

  useLayoutEffect(() => {
    const prev = beforeRects.current;
    beforeRects.current = null;
    if (moveCleanupRef.current) {
      window.clearTimeout(moveCleanupRef.current);
      moveCleanupRef.current = null;
    }
    if (!prev) return;

    const moved: HTMLElement[] = [];
    prev.forEach((prevRect, id) => {
      const el = tileRefs.current.get(id);
      if (!el) return;
      const nextRect = el.getBoundingClientRect();
      const dx = prevRect.left - nextRect.left;
      const dy = prevRect.top - nextRect.top;
      if (dx === 0 && dy === 0) return;
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      moved.push(el);
    });

    tileRefs.current.forEach((el, id) => {
      if (!prev.has(id)) {
        el.style.animation = "game-tile-in 300ms ease";
      }
    });

    if (moved.length > 0) {
      void document.body.offsetWidth;
      requestAnimationFrame(() => {
        for (const el of moved) {
          el.style.transition = "transform 260ms cubic-bezier(0.25, 1, 0.5, 1)";
          el.style.transform = "translate(0, 0)";
        }
      });
      moveCleanupRef.current = window.setTimeout(() => {
        for (const el of moved) {
          el.style.transition = "";
          el.style.transform = "";
        }
      }, 360);
    }
  }, [wordOrder, prompts, active]);

  const total = matched.length + active.length + queue.length;
  const done = status === "ready" && active.length === 0 && queue.length === 0;

  function startGame(entries: HistoryEntry[], nextModes: MatchMode[]) {
    const deck = buildDeck(entries, nextModes);
    if (deck.length === 0) {
      setStatus("empty");
      return;
    }
    const dealt = dealGame(deck);
    setActive(dealt.active);
    setQueue(dealt.queue);
    setWordOrder(dealt.wordOrder);
    setPrompts(buildPrompts(dealt.active));
    setSelWord(null);
    setSelPrompt(null);
    setFeedback(null);
    setMatched([]);
    setStatus("ready");
  }

  useEffect(() => {
    fetch("/api/game")
      .then((r) => r.json())
      .then((d) => {
        const entries = (d.entries ?? []) as HistoryEntry[];
        setHistory(entries);
        startGame(entries, DEFAULT_MODES);
      })
      .catch(() => setStatus("empty"));
  }, []);

  function toggleMode(mode: MatchMode) {
    const next = modes.includes(mode) ? modes.filter((m) => m !== mode) : [...modes, mode];
    if (next.length === 0) return;
    setModes(next);
    startGame(history, next);
  }

  function attemptMatch(wordId: string, promptKey: string) {
    snapshotPositions();
    if (evaluateMatch(prompts, wordId, promptKey)) {
      const matchedEntry = active.find((e) => e.id === wordId)!;
      const { active: nextActive, queue: nextQueue, added } = applyCorrectMatch(active, queue, wordId);
      setActive(nextActive);
      setQueue(nextQueue);
      const nextIds = nextActive.map((e) => e.id);
      setWordOrder(added.length > 0 ? shuffle(nextIds) : wordOrder.filter((id) => id !== wordId));
      setPrompts(buildPrompts(nextActive));
      setMatched((m) => [...m, matchedEntry]);
      setFeedback("correct");
    } else {
      setWordOrder(shuffle(active.map((e) => e.id)));
      setPrompts(buildPrompts(active));
      setFeedback("incorrect");
    }
    setSelWord(null);
    setSelPrompt(null);
  }

  function handleWordClick(id: string) {
    setFeedback(null);
    if (selPrompt) {
      attemptMatch(id, selPrompt);
    } else {
      setSelWord(id === selWord ? null : id);
    }
  }

  function handlePromptClick(key: string) {
    setFeedback(null);
    if (selWord) {
      attemptMatch(selWord, key);
    } else {
      setSelPrompt(key === selPrompt ? null : key);
    }
  }

  return (
    <div className="mx-auto p-10 space-y-8" style={{ maxWidth: 1200 }}>
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Word Match</h1>
        <p className="text-sm text-zinc-500">
          Click a word, then click one of its matching cards. Wrong matches go back in the
          rotation.
        </p>
        <div className="flex items-center gap-3">
          {MODE_OPTIONS.map(({ value, label }) => {
            const on = modes.includes(value);
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
          No words have been sent yet, or none have data for the selected match types yet — the
          pool fills up as words are sent.
        </p>
      )}

      {status === "ready" && (
        <>
          {done && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-6 text-center space-y-4">
              <p className="font-semibold text-green-700">
                You matched all {matched.length} words!
              </p>
              <button
                onClick={() => startGame(history, modes)}
                className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Play again
              </button>
            </div>
          )}

          {!done && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">
                  Matched {matched.length} of {total}
                </span>
                {feedback === "correct" && (
                  <span className="text-green-600 font-medium">Correct!</span>
                )}
                {feedback === "incorrect" && (
                  <span className="text-red-600 font-medium">
                    Not a match — those go back in the rotation.
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8 items-start">
                <div className="space-y-3 min-w-0">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Words
                  </h2>
                  {slots.map((i) => {
                    const id = wordOrder[i];
                    const e = id ? active.find((x) => x.id === id) : undefined;
                    if (!e) {
                      return (
                        <div
                          key={`w-empty-${i}`}
                          className="h-24 w-full border border-dashed border-zinc-200 rounded-lg"
                        />
                      );
                    }
                    const selected = selWord === e.id;
                    return (
                      <button
                        key={e.id}
                        ref={(el) => {
                          if (el) tileRefs.current.set(`${e.id}:word`, el);
                          else tileRefs.current.delete(`${e.id}:word`);
                        }}
                        onClick={() => handleWordClick(e.id)}
                        className={`flex items-center justify-center h-24 w-full overflow-hidden px-4 text-center border rounded-lg text-lg font-bold transition-colors ${
                          selected
                            ? "border-zinc-800 bg-zinc-100 ring-1 ring-zinc-800"
                            : "border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        <span className="line-clamp-2 min-w-0 break-words">{e.word}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3 min-w-0">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    {modes.map((m) => MODE_LABEL[m]).join(" / ")}
                  </h2>
                  {slots.map((i) => {
                    const p = prompts[i];
                    if (!p) {
                      return (
                        <div
                          key={`p-empty-${i}`}
                          className="h-24 w-full border border-dashed border-zinc-200 rounded-lg"
                        />
                      );
                    }
                    const selected = selPrompt === p.key;
                    return (
                      <button
                        key={p.key}
                        ref={(el) => {
                          if (el) tileRefs.current.set(p.key, el);
                          else tileRefs.current.delete(p.key);
                        }}
                        onClick={() => handlePromptClick(p.key)}
                        className={`flex items-center justify-center h-24 w-full overflow-hidden px-4 text-center border rounded-lg text-sm transition-colors ${
                          selected
                            ? "border-zinc-800 bg-zinc-100 ring-1 ring-zinc-800"
                            : "border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        <span className="line-clamp-3 min-w-0 break-words">{p.value}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {matched.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Matched
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {matched.map((m) => (
                      <span
                        key={m.id}
                        className="px-3 py-1 bg-green-50 border border-green-200 rounded-full text-sm text-green-700"
                      >
                        {m.word} ✓
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
