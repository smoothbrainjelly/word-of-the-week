import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { requireAuth } from "@/lib/auth";
import { wordToSlug } from "@/lib/slug";
import type { HistoryEntry } from "@/lib/types";

type Context = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Context) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const history = (await redis.get<HistoryEntry[]>("history")) ?? [];
  const entry = history.findLast((h) => wordToSlug(h.word) === wordToSlug(slug));
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(entry);
}
