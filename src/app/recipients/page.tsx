"use client";

import { useEffect, useState, useCallback } from "react";
import type { Recipient } from "@/lib/types";

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/recipients");
    setRecipients(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    setName("");
    setEmail("");
    load();
  }

  async function toggleActive(r: Recipient) {
    await fetch(`/api/recipients/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !r.active }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/recipients/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Recipients</h1>

      <form onSubmit={add} className="flex gap-3">
        <input
          placeholder="Name"
          className="border rounded-lg p-2 flex-1 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="border rounded-lg p-2 flex-1 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium">
          Add
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-zinc-500">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {recipients.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2">{r.name}</td>
              <td className="py-2">{r.email}</td>
              <td className="py-2">
                <button
                  onClick={() => toggleActive(r)}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    r.active
                      ? "bg-green-100 text-green-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {r.active ? "Active" : "Inactive"}
                </button>
              </td>
              <td className="py-2 text-right">
                <button
                  onClick={() => remove(r.id)}
                  className="text-red-500 text-xs hover:underline"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {recipients.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-zinc-400">
                No recipients yet. Add one above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
