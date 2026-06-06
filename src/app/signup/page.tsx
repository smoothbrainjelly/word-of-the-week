"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/auth/send-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong");
    }
    setSending(false);
  }

  if (sent) {
    return (
      <div className="max-w-sm mx-auto p-8 pt-20 text-center space-y-4">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-zinc-500 text-sm">
          We sent a magic link to <strong>{email}</strong>. Click it to sign in.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto p-8 pt-20 space-y-6">
      <h1 className="text-2xl font-bold">Sign up</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          placeholder="Name"
          className="border rounded-lg p-2 w-full text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="border rounded-lg p-2 w-full text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button disabled={sending} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium w-full disabled:opacity-50">
          {sending ? "Sending…" : "Send magic link"}
        </button>
      </form>
      <p className="text-sm text-zinc-500 text-center">
        Already have an account?{" "}
        <Link href="/login" className="underline">Sign in</Link>
      </p>
    </div>
  );
}
