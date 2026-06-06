import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { requireAuth } from "@/lib/auth";
import type { HistoryEntry } from "@/lib/types";

export async function GET(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  let page = parseInt(searchParams.get("page") ?? "1");
  let limit = parseInt(searchParams.get("limit") ?? "10");
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 10;
  limit = Math.min(limit, 50);

  const history = (await redis.get<HistoryEntry[]>("history")) ?? [];
  const total = history.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const entries = history.toReversed().slice(start, start + limit);

  return NextResponse.json({ entries, total, totalPages, page });
}
