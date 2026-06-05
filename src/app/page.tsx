"use client";

import { useEffect, useState } from "react";
import type { Recipient, Settings, HistoryEntry } from "@/lib/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function daysUntil(day: string, time: string, timezone: string): string {
  if (!time) return "—";
  const now = new Date();
  const dayIndex = DAYS.indexOf(day);
  if (dayIndex === -1) return "—";

  const currentDay = now.getDay();
  let diff = dayIndex - currentDay;
  if (diff < 0 || (diff === 0 && now.getHours() >= parseInt(time.split(":")[0]))) {
    diff += 7;
  }

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `${day} (${diff} days)`;
}

export default function DashboardPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [recent, setRecent] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings);

    fetch("/api/recipients")
      .then((r) => r.json())
      .then((list) => {
        setTotalRecipients(list.length);
        setActiveCount((list as Recipient[]).filter((r) => r.active).length);
      });

    fetch("/api/history?page=1&limit=5")
      .then((r) => r.json())
      .then((d) => setRecent(d.entries));
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold">Word of the Week</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{totalRecipients}</p>
          <p className="text-xs text-zinc-500">Recipients</p>
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

      {settings && (
        <div className="border rounded-lg p-4 space-y-1">
          <p className="text-sm font-medium">Next Delivery</p>
          <p className="text-lg font-bold">
            {daysUntil(settings.day, settings.time, settings.timezone)}
          </p>
          <p className="text-sm text-zinc-500">
            {settings.day} at {settings.time} ({settings.timezone})
          </p>
        </div>
      )}

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
