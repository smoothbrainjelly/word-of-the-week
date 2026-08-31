"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PronounceButton from "@/components/PronounceButton";
import type { HistoryEntry } from "@/lib/types";

export default function WordDetailPage() {
  const params = useParams<{ slug: string }>();
  const [entry, setEntry] = useState<HistoryEntry | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/word/${params.slug}`)
      .then(async (res) => {
        if (!res.ok) {
          setError((await res.json()).error ?? "Word not found");
          return null;
        }
        return res.json();
      })
      .then((data) => setEntry(data));
  }, [params.slug]);

  if (error) {
    return (
      <div className="mx-auto p-10 space-y-4" style={{ maxWidth: 720 }}>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Back to dashboard
        </Link>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!entry) {
    return <div className="p-10 text-zinc-500">Loading…</div>;
  }

  return (
    <div className="mx-auto p-10 space-y-8" style={{ maxWidth: 720 }}>
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to dashboard
      </Link>

      <div className="p-8 bg-white">
        <div className="text-xs text-zinc-400">
          {new Date(entry.sentAt).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>

        <div className="mt-2">
          <h1 className="text-4xl font-bold">
            {entry.word}
            {entry.part_of_speech && (
              <span className="ml-3 text-lg font-medium text-zinc-400">
                {entry.part_of_speech}
              </span>
            )}
          </h1>
          {(entry.pronunciation || entry.simple_pronunciation) && (
            <p className="mt-2 text-lg text-zinc-600">
              {entry.pronunciation}
              {entry.pronunciation && entry.simple_pronunciation && " — "}
              {entry.simple_pronunciation}
            </p>
          )}

          <div className="mt-4">
            <PronounceButton slug={params.slug} />
          </div>
        </div>

        <hr className="my-8 border-zinc-200" />

        <div className="space-y-8">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
              Definition
            </h2>
            <p className="text-lg leading-relaxed">{entry.definition}</p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
              Etymology
            </h2>
            <p className="text-lg leading-relaxed">{entry.etymology}</p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
              Example
            </h2>
            <blockquote className="border-l-3 border-zinc-300 pl-4 font-serif text-lg italic text-zinc-700">
              {entry.example}
            </blockquote>
          </section>

          {entry.synonyms && entry.synonyms.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                Synonyms
              </h2>
              <div className="flex flex-wrap gap-2">
                {entry.synonyms.map((synonym) => (
                  <span
                    key={synonym}
                    className="px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-full text-sm text-zinc-700"
                  >
                    {synonym}
                  </span>
                ))}
              </div>
            </section>
          )}

          {entry.antonyms && entry.antonyms.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                Antonyms
              </h2>
              <div className="flex flex-wrap gap-2">
                {entry.antonyms.map((antonym) => (
                  <span
                    key={antonym}
                    className="px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-full text-sm text-zinc-700"
                  >
                    {antonym}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        <hr className="my-8 border-zinc-200" />
        
      </div>
    </div>
  );
}
