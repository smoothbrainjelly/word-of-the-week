import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import type { HistoryEntry } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50);

  const history = (await redis.get<HistoryEntry[]>("history")) ?? [];
  const total = history.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const entries = history.reverse().slice(start, start + limit);

  return NextResponse.json({ entries, total, totalPages, page });
}
