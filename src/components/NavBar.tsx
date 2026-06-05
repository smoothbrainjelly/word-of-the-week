"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@/lib/auth";

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, [pathname]);

  const isAdmin = user?.role === "admin";

  return (
    <nav className="border-b">
      <div className="max-w-2xl mx-auto px-8 py-3 flex gap-6 text-sm font-medium items-center">
        <Link href="/" className="hover:text-zinc-600">Dashboard</Link>
        {isAdmin && <Link href="/settings" className="hover:text-zinc-600">Settings</Link>}
        {isAdmin && <Link href="/preview" className="hover:text-zinc-600">Preview</Link>}
        {isAdmin && <Link href="/users" className="hover:text-zinc-600">Users</Link>}
        <Link href="/history" className="hover:text-zinc-600">History</Link>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="text-xs text-zinc-400">{user.name}</span>
              {isAdmin && (
                <span className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded font-mono">
                  admin
                </span>
              )}
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                className="text-xs text-zinc-500 hover:text-zinc-800"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-800">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
