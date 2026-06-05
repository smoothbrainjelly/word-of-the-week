"use client";

import { useEffect, useState } from "react";
import type { Settings } from "@/lib/types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIMEZONES = Intl.supportedValuesOf
  ? Intl.supportedValuesOf("timeZone")
  : ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "UTC"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) return <div className="p-8 text-zinc-500">Loading…</div>;

  return (
    <div className="mx-auto p-10 space-y-6" style={{ maxWidth: 1200 }}>
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Prompt Theme</label>
          <textarea
            className="w-full border rounded-lg p-2 text-sm"
            rows={3}
            value={settings.promptTheme}
            onChange={(e) => setSettings({ ...settings, promptTheme: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Day of Week</label>
          <select
            className="w-full border rounded-lg p-2"
            value={settings.day}
            onChange={(e) => setSettings({ ...settings, day: e.target.value })}
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Time</label>
          <input
            type="time"
            className="w-full border rounded-lg p-2"
            value={settings.time}
            onChange={(e) => setSettings({ ...settings, time: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Timezone</label>
          <select
            className="w-full border rounded-lg p-2"
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved!" : "Save Settings"}
      </button>
    </div>
  );
}
