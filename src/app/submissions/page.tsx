"use client";

import { useEffect, useState, useCallback } from "react";
import type { WordSubmission } from "@/lib/word-submissions";

type Tab = "pending" | "approved" | "rejected";

export default function SubmissionsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [submissions, setSubmissions] = useState<WordSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (tab: Tab) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/submissions?status=${tab}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions ?? []);
      } else {
        setError("Could not load submissions.");
      }
    } catch {
      setError("Could not load submissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(tab);
  }, [tab, load]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setBusy(id);
    setError("");
    try {
      const res = await fetch("/api/submissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setError(data.error ?? "Could not update submission.");
        await load(tab);
        return;
      }
      if (!res.ok) {
        setError("Could not update submission.");
        return;
      }
      await load(tab);
    } catch {
      setError("Could not update submission.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto p-10 space-y-6" style={{ maxWidth: 1200 }}>
      <h1 className="text-2xl font-bold">Word Submissions</h1>
      <p className="text-sm text-zinc-500">
        Review words submitted by users. Approving a word adds it to the pool.
      </p>

      <div className="flex items-center gap-3">
        {(["pending", "approved", "rejected"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`px-3 py-1.5 border rounded-full text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-zinc-800 text-white border-zinc-800"
                : "border-zinc-300 text-zinc-600 hover:border-zinc-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {loading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : submissions.length === 0 ? (
        <p className="text-zinc-400">No {tab} submissions.</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold">{s.word}</p>
                  <p className="text-xs text-zinc-500">
                    by {s.submittedBy || "unknown"} ·{" "}
                    {new Date(s.submittedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {s.handledAt && (
                    <p className="text-xs text-zinc-400">
                      {s.status} by {s.handledBy || "unknown"} on{" "}
                      {new Date(s.handledAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                {tab === "pending" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(s.id, "approve")}
                      disabled={busy === s.id}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-700 text-white disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(s.id, "reject")}
                      disabled={busy === s.id}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-zinc-300 text-zinc-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
