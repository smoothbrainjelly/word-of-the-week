"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) return;

    fetch(`/api/unsubscribe?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.email) {
          setEmail(d.email);
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "loading") {
    return <p className="text-zinc-500">Processing your request...</p>;
  }

  if (status === "error") {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-zinc-500 mb-6">
          The unsubscribe link may be invalid or expired.
        </p>
        <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-800 underline">
          Sign in to manage your subscription
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Unsubscribed</h1>
      <p className="text-zinc-500 mb-6">
        {email ? `${email} has been` : "You've been"} unsubscribed from Word of the Week. You will no longer receive weekly emails.
      </p>
      <p className="text-sm text-zinc-400">
        Changed your mind?{" "}
        <Link href="/login" className="text-zinc-600 hover:text-zinc-800 underline">
          Sign in to re-subscribe
        </Link>
      </p>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md text-center">
        <Suspense fallback={<p className="text-zinc-500">Processing your request...</p>}>
          <UnsubscribeContent />
        </Suspense>
      </div>
    </div>
  );
}
