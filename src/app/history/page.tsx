"use client";

import { useEffect, useState, useCallback } from "react";
import type { PaginatedHistory } from "@/lib/types";

export default function HistoryPage() {
  const [data, setData] = useState<PaginatedHistory | null>(null);
  const [page, setPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refilling, setRefilling] = useState(false);
  const [refillResult, setRefillResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/history?page=${page}&limit=10`);
    setData(await res.json());
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((u) => { if (u?.user?.role === "admin") setIsAdmin(true); })
      .catch(() => {});
  }, []);

  async function handleRefill() {
    setRefilling(true);
    setRefillResult(null);
    try {
      const res = await fetch("/api/admin/refill-pool", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setRefillResult(`Added ${json.added} words (pool size: ${json.poolSize})`);
      } else {
        setRefillResult(`Error: ${json.error}`);
      }
    } catch {
      setRefillResult("Refill failed");
    } finally {
      setRefilling(false);
    }
  }

  if (!data) return <div className="p-8 text-zinc-500">Loading…</div>;

  return (
    <div className="mx-auto p-10 space-y-6" style={{ maxWidth: 1200 }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">History</h1>
        {isAdmin && (
          <div className="flex items-center gap-3">
            {refillResult && <span className="text-sm text-zinc-500">{refillResult}</span>}
            <button
              onClick={handleRefill}
              disabled={refilling}
              className="px-3 py-1 border rounded text-sm disabled:opacity-30"
            >
              {refilling ? "Refilling…" : "Refill Word Pool"}
            </button>
          </div>
        )}
      </div>

      {data.entries.length === 0 && (
        <p className="text-zinc-400">No words sent yet. The cron job will send the first one on schedule.</p>
      )}

      <div className="space-y-4">
        {data.entries.map((entry) => (
          <div key={entry.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{entry.word}</h2>
                {(entry.pronunciation || entry.simple_pronunciation) && (
                  <p className="text-sm text-zinc-500">{entry.pronunciation}{entry.pronunciation && entry.simple_pronunciation ? " — " : ""}{entry.simple_pronunciation}</p>
                )}
              </div>
              <span className="text-xs text-zinc-400">
                {new Date(entry.sentAt).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <p><span className="font-medium">Definition:</span> {entry.definition}</p>
            <p><span className="font-medium">Etymology:</span> {entry.etymology}</p>
            <p><span className="font-medium">Example:</span> <em>{entry.example}</em></p>
            <p className="text-xs text-zinc-400">Sent to {entry.recipientCount} recipient{entry.recipientCount !== 1 ? "s" : ""}</p>
          </div>
        ))}
      </div>

      {data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-30"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-zinc-500">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
