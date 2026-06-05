"use client";

import { useEffect, useState } from "react";
import type { User } from "@/lib/auth";

type WordCard = {
  word: string;
  pronunciation: string;
  simple_pronunciation: string;
  definition: string;
  etymology: string;
  example: string;
};

const PLACEHOLDER_COMPACT = `<div style="font-family:Georgia,serif;color:#1a1a1a;line-height:1.5">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:2px">Word of the Week</div>
<div style="font-size:28px;font-weight:700;margin-bottom:2px">Lorem Ipsum</div>
<div style="font-size:14px;color:#666;margin-bottom:12px">/ˈlɒrəm ˈɪpsəm/ — LOR-əm IP-səm</div>
<hr style="border:none;border-top:1px solid #e5e5e5;margin:0 0 12px">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:2px">Definition</div>
<div style="font-size:14px;margin-bottom:12px">Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.</div>
<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:2px">Etymology</div>
<div style="font-size:14px;margin-bottom:12px">From Latin <em>ipsum</em>, meaning "itself".</div>
<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:2px">Example</div>
<blockquote style="margin:0 0 0 12px;padding-left:12px;border-left:2px solid #ddd;font-style:italic;font-size:14px;color:#555">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</blockquote>
</div>`;

const PLACEHOLDER_EMAIL = `<div style="max-width:600px;margin:0 auto;font-family:Georgia,serif;color:#1a1a1a;padding:40px 20px;line-height:1.6">
<h1 style="font-size:14px;text-transform:uppercase;letter-spacing:2px;color:#888;margin:0 0 8px">Word of the Week</h1>
<h2 style="font-size:36px;margin:0 0 4px;font-weight:700">Lorem Ipsum</h2>
<p style="font-size:16px;color:#666;margin:0 0 24px">/ˈlɒrəm ˈɪpsəm/ — LOR-əm IP-səm</p>
<hr style="border:none;border-top:2px solid #e5e5e5;margin:0 0 24px">
<h3 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 4px">Definition</h3>
<p style="margin:0 0 20px;font-size:16px">Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.</p>
<h3 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 4px">Etymology</h3>
<p style="margin:0 0 20px;font-size:16px">From Latin <em>ipsum</em>, meaning "itself".</p>
<h3 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 4px">Example</h3>
<blockquote style="margin:0 0 0 16px;padding-left:16px;border-left:3px solid #ddd;font-style:italic;font-size:16px;color:#555">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</blockquote>
<hr style="border:none;border-top:2px solid #e5e5e5;margin:24px 0">
<p style="font-size:13px;color:#888"><a href="#" style="color:#666">Unsubscribe</a> from Word of the Week.</p>
</div>`;

export default function PreviewPage() {
  const [word, setWord] = useState<WordCard | null>(null);
  const [cardHtml, setCardHtml] = useState("");
  const [emailHtml, setEmailHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");

  useEffect(() => { loadUsers(); }, []);

  async function generate() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/preview", { method: "POST" });
    if (!res.ok) {
      setError((await res.json()).error);
      setLoading(false);
      return;
    }

    const w = await res.json();
    setWord(w);

    const [cardRes, emailRes] = await Promise.all([
      fetch("/api/preview/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...w, compact: true }),
      }),
      fetch("/api/preview/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...w, compact: false }),
      }),
    ]);

    if (cardRes.ok) {
      const { html } = await cardRes.json();
      setCardHtml(html);
    }
    if (emailRes.ok) {
      const { html } = await emailRes.json();
      setEmailHtml(html);
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

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }

  return (
    <div className="mx-auto p-10 space-y-6" style={{ maxWidth: 1200 }}>
      <h1 className="text-2xl font-bold">Preview</h1>

      <button
        onClick={generate}
        disabled={loading}
        className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate Sample Word"}
      </button>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-6">
        <div className="border rounded-lg p-4 bg-white">
          <div className="bg-zinc-50 -mx-4 -mt-4 px-4 py-1.5 border-b text-xs text-zinc-500 font-medium mb-3">
            Card Preview
          </div>
          <div dangerouslySetInnerHTML={{ __html: cardHtml || PLACEHOLDER_COMPACT }} />
        </div>

        <div className="border rounded-lg bg-white overflow-hidden">
          <div className="bg-zinc-50 border-b px-4 py-1.5 text-xs text-zinc-500 font-medium">
            Email Preview
          </div>
          <div className="p-4" dangerouslySetInnerHTML={{ __html: emailHtml || PLACEHOLDER_EMAIL }} />
        </div>

        {word && (
          <div className="col-span-2 border rounded-lg p-4 space-y-2">
            <label className="block text-sm font-medium">Send test email to:</label>
            <div className="flex gap-2">
              <select
                className="flex-1 border rounded-lg p-2 text-sm"
                value={selectedEmail}
                onChange={(e) => { setSelectedEmail(e.target.value); setSent(false); }}
              >
                <option value="">Select a recipient</option>
                {users.filter((u) => u.active).map((u) => (
                  <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
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
        )}
      </div>
    </div>
  );
}
