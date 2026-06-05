"use client";

import { useEffect, useState } from "react";
import type { HistoryEntry } from "@/lib/types";
import type { User } from "@/lib/auth";

export default function DashboardPage() {
  const [activeCount, setActiveCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [recent, setRecent] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((list) => {
        const users = list as User[];
        setTotalUsers(users.length);
        setActiveCount(users.filter((u) => u.active).length);
      });

    fetch("/api/history?page=1&limit=5")
      .then((r) => r.json())
      .then((d) => setRecent(d.entries));
  }, []);

  return (
    <div className="mx-auto p-10 space-y-8" style={{ maxWidth: 1200 }}>
      <h1 className="text-2xl font-bold">Word of the Week</h1>

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



      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Words</h2>
        {recent.length === 0 && (
          <p className="text-zinc-400 text-sm">No words sent yet.</p>
        )}
        {recent.map((entry) => (
          <div key={entry.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-lg">{entry.word}</p>
              <p className="text-xs text-zinc-400">
                {new Date(entry.sentAt).toLocaleDateString()}
              </p>
            </div>
            <p className="text-sm text-zinc-600 mt-1">{entry.definition}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
