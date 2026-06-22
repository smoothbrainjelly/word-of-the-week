"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong");
    }
    setSending(false);
  }

  return (
    <div className="max-w-sm mx-auto p-8 pt-20 space-y-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="border rounded-lg p-2 w-full text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="border rounded-lg p-2 w-full text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button disabled={sending} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium w-full disabled:opacity-50">
          {sending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_EMAIL && (
        <button
          onClick={async () => {
            const res = await fetch("/api/auth/dev-login", { method: "POST" });
            if (res.ok) {
              window.location.href = "/";
            } else {
              const data = await res.json();
              setError(data.error || "Dev login failed");
            }
          }}
          className="w-full border border-zinc-300 text-zinc-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50"
        >
          Dev login ({process.env.NEXT_PUBLIC_DEV_EMAIL})
        </button>
      )}
      <p className="text-sm text-zinc-500 text-center">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="underline">Sign up</Link>
      </p>
    </div>
  );
}
