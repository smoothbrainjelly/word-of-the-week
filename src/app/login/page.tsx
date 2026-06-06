"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/send-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", email }),
    });
    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json();
      if (data.error?.includes("Name is required")) {
        setError("No account found with this email. Please sign up instead.");
      } else {
        setError(data.error || "Something went wrong");
      }
    }
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
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium w-full">
          Send magic link
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
