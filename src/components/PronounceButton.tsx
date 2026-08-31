"use client";

import { useRef, useState } from "react";

const SPEEDS = [
  { label: "Normal", rate: 1 },
  { label: "Slow", rate: 0.7 },
  { label: "Slower", rate: 0.5 },
] as const;

export default function PronounceButton({ slug }: { slug: string }) {
  const [speedIdx, setSpeedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedSlugRef = useRef<string | null>(null);

  async function ensureAudio(): Promise<HTMLAudioElement | null> {
    if (audioRef.current && loadedSlugRef.current === slug) {
      return audioRef.current;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/word/${encodeURIComponent(slug)}/speech`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to generate pronunciation");
      }

      const element = new Audio();
      element.preload = "auto";
      element.src = `data:${json.mimeType};base64,${json.audio}`;
      element.onerror = () => {
        setError(element.error?.message ?? "Playback failed");
      };
      loadedSlugRef.current = slug;
      audioRef.current = element;
      return element;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate pronunciation");
      return null;
    } finally {
      setLoading(false);
    }
  }

  function applySpeed(element: HTMLAudioElement, rate: number) {
    element.preservesPitch = true;
    element.playbackRate = rate;
  }

  async function play() {
    const audio = await ensureAudio();
    if (!audio) return;
    applySpeed(audio, SPEEDS[speedIdx].rate);
    audio.currentTime = 0;
    try {
      await audio.play();
    } catch (err) {
      setError(audio.error?.message ?? (err instanceof Error ? err.message : "Playback failed"));
    }
  }

  function selectSpeed(idx: number) {
    setSpeedIdx(idx);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={play}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50"
      >
        {loading ? "Loading…" : "▶ Listen"}
      </button>

      <div className="inline-flex border border-zinc-200 text-sm">
        {SPEEDS.map((speed, idx) => (
          <button
            key={speed.label}
            type="button"
            onClick={() => selectSpeed(idx)}
            className={`px-3 py-2 ${
              idx === speedIdx
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {speed.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
