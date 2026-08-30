import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { requireAuth } from "@/lib/auth";
import { wordToSlug } from "@/lib/slug";
import { synthesizeSpeech } from "@/lib/gemini";
import type { HistoryEntry } from "@/lib/types";
import type { SpeechAudio } from "@/lib/gemini";

type Context = {
  params: Promise<{ slug: string }>;
};

export async function POST(_request: Request, { params }: Context) {
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

  const cacheKey = `speech:${wordToSlug(entry.word)}`;

  try {
    const cached = await redis.get<SpeechAudio>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const speech = await synthesizeSpeech(entry.word);

    try {
      await redis.set(cacheKey, speech);
    } catch (err) {
      console.warn("[speech] failed to cache audio", {
        cacheKey,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json(speech);
  } catch (err) {
    console.error("[speech] synthesis failed", {
      word: entry.word,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to generate pronunciation" },
      { status: 502 },
    );
  }
}
