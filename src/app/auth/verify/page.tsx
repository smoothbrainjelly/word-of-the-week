"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function VerifyHandler() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      window.location.href = `/api/auth/verify?token=${token}`;
    }
  }, [token]);

  if (!token) {
    return (
      <div className="max-w-sm mx-auto p-8 pt-20 text-center space-y-4">
        <h1 className="text-2xl font-bold">Verification failed</h1>
        <p className="text-red-500 text-sm">Missing verification token</p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto p-8 pt-20 text-center space-y-4">
      <h1 className="text-2xl font-bold">Verifying...</h1>
      <p className="text-zinc-500 text-sm">You&apos;ll be redirected shortly.</p>
    </div>
  );
}

export default function AuthVerifyPage() {
  return (
    <Suspense fallback={
      <div className="max-w-sm mx-auto p-8 pt-20 text-center space-y-4">
        <h1 className="text-2xl font-bold">Verifying...</h1>
      </div>
    }>
      <VerifyHandler />
    </Suspense>
  );
}
