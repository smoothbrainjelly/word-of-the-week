"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HistoryEntry } from "@/lib/types";
import type { User } from "@/lib/auth";
import type { WordSubmission } from "@/lib/word-submissions";
import { wordToSlug } from "@/lib/slug";

export default function DashboardPage() {
  const [activeCount, setActiveCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [recent, setRecent] = useState<HistoryEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [submittedWord, setSubmittedWord] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitDone, setSubmitDone] = useState("");
  const [mySubmissions, setMySubmissions] = useState<WordSubmission[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.role === "admin") {
          setIsAdmin(true);
          fetch("/api/users")
            .then((r) => r.json())
            .then((list) => {
              const users = list as User[];
              setTotalUsers(users.length);
              setActiveCount(users.filter((u) => u.active).length);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    fetch("/api/history?page=1&limit=5")
      .then((r) => r.json())
      .then((d) => setRecent(d.entries));

    fetch("/api/submissions")
      .then((r) => r.json())
      .then((d) => setMySubmissions(d.submissions ?? []))
      .catch(() => {});
  }, []);

  async function handleSubmitWord(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitDone("");
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: submittedWord }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Submission failed");
        return;
      }
      setSubmittedWord("");
      setSubmitDone(`${data.submission?.word} submitted for review`);
      setMySubmissions((prev) => [...(prev ?? []), data.submission]);
    } catch {
      setSubmitError("Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto p-10 space-y-8" style={{ maxWidth: 1200 }}>
      <h1 className="text-2xl font-bold">Word of the Week</h1>

      <div className="border rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Suggest a word</h2>
          <p className="text-sm text-zinc-500">
            Submit a word to add to the weekly newsletter. An admin will review it
            before it enters the word pool.
          </p>
        </div>
        <form onSubmit={handleSubmitWord} className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={submittedWord}
            onChange={(e) => setSubmittedWord(e.target.value)}
            placeholder="e.g. serendipity"
            className="flex-1 min-w-48 border rounded-lg p-2 text-sm"
            required
            maxLength={45}
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-black text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit word"}
          </button>
        </form>
        {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
        {submitDone && <p className="text-green-600 text-sm">{submitDone}</p>}
        {mySubmissions.length > 0 && (
          <div className="text-xs text-zinc-500">
            <span className="font-medium">Pending submissions:</span>{" "}
            {mySubmissions.map((s) => s.word).join(", ")}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{totalUsers}</p>
            <p className="text-xs text-zinc-500">Users</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-xs text-zinc-500">Active</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{recent.length > 0 ? "✓" : "—"}</p>
            <p className="text-xs text-zinc-500">Last Sent</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Words</h2>
        {recent.length === 0 && (
          <p className="text-zinc-400 text-sm">No words sent yet.</p>
        )}
        {recent.map((entry) => (
          <Link
            key={entry.id}
            href={`/word/${wordToSlug(entry.word)}`}
            className="block border rounded-lg p-4 hover:border-zinc-400 transition-colors"
          >
            <div className="flex items-center justify-between">
              <p className="font-bold text-lg">{entry.word}</p>
              <p className="text-xs text-zinc-400">
                {new Date(entry.sentAt).toLocaleDateString()}
              </p>
            </div>
            <p className="text-sm text-zinc-600 mt-1">{entry.definition}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
