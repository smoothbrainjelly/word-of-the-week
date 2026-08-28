import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { requireAuth } from "@/lib/auth";
import type { HistoryEntry } from "@/lib/types";

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const entries = (await redis.get<HistoryEntry[]>("history")) ?? [];
  return NextResponse.json({ entries });
}
