"use client";

import { useEffect, useState, useCallback } from "react";
import type { User } from "@/lib/auth";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function toggleActive(user: User) {
    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, active: !user.active }),
    });
    load();
  }

  async function changeRole(user: User, role: string) {
    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, role }),
    });
    load();
  }

  async function remove(userId: string) {
    await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    load();
  }

  return (
    <div className="mx-auto p-10 space-y-8" style={{ maxWidth: 1200 }}>
      <h1 className="text-2xl font-bold">Users</h1>

      <table className="w-full text-base">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Email</th>
            <th className="pb-3 font-medium">Role</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-3 pr-6">{u.name}</td>
              <td className="py-3 pr-6">{u.email}</td>
              <td className="py-3 pr-6">
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u, e.target.value)}
                  className="text-sm font-mono border rounded px-3 py-1.5 bg-white"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td className="py-3 pr-6">
                <button
                  onClick={() => toggleActive(u)}
                  className={`text-sm font-medium px-3 py-1 rounded-full ${
                    u.active
                      ? "bg-green-100 text-green-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {u.active ? "Active" : "Inactive"}
                </button>
              </td>
              <td className="py-3 text-right">
                <button
                  onClick={() => remove(u.id)}
                  className="text-red-500 text-sm hover:underline"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="py-12 text-center text-zinc-400 text-base">
                No users yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
