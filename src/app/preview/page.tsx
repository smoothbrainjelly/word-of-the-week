"use client";

import { useState } from "react";
import type { Recipient } from "@/lib/types";

type WordCard = {
  word: string;
  definition: string;
  etymology: string;
  example: string;
};

export default function PreviewPage() {
  const [word, setWord] = useState<WordCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    setWord(null);
    const res = await fetch("/api/preview", { method: "POST" });
    if (!res.ok) {
      setError((await res.json()).error);
    } else {
      setWord(await res.json());
    }
    setLoading(false);
  }

  async function handleTestSend() {
    if (!selectedEmail || !word) return;
    setSending(true);
    const res = await fetch("/api/preview/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: selectedEmail }),
    });
    if (res.ok) setSent(true);
    setSending(false);
  }

  async function loadRecipients() {
    const res = await fetch("/api/recipients");
    setRecipients(await res.json());
  }

  return (
    <div className="max-w-xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Preview</h1>

      <button
        onClick={generate}
        disabled={loading}
        className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate Sample Word"}
      </button>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {word && (
        <div className="border rounded-lg p-6 space-y-3">
          <h2 className="text-3xl font-bold">{word.word}</h2>
          <p><span className="font-medium">Definition:</span> {word.definition}</p>
          <p><span className="font-medium">Etymology:</span> {word.etymology}</p>
          <p><span className="font-medium">Example:</span> <em>{word.example}</em></p>

          <div className="pt-4 border-t space-y-2">
            <label className="block text-sm font-medium">Send test email to:</label>
            <div className="flex gap-2">
              <select
                className="flex-1 border rounded-lg p-2 text-sm"
                value={selectedEmail}
                onClick={loadRecipients}
                onChange={(e) => { setSelectedEmail(e.target.value); setSent(false); }}
              >
                <option value="">Select a recipient</option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.email}>{r.name} ({r.email})</option>
                ))}
              </select>
              <button
                onClick={handleTestSend}
                disabled={!selectedEmail || sending}
                className="bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {sending ? "Sending…" : sent ? "Sent!" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
