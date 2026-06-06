"use client";

import { Suspense, useEffect, useState } from "react";

function VerifyHandler() {
  const [error, setError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(true);
      return;
    }
    window.location.href = `/api/auth/verify?token=${token}`;
  }, []);

  if (error) {
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
