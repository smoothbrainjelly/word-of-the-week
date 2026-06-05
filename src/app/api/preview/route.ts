import { NextResponse } from "next/server";
import { generateWord } from "@/lib/gemini";
import { redis } from "@/lib/redis";
import type { Settings } from "@/lib/types";

export async function POST() {
  const settings = await redis.get<Settings>("settings");
  const theme = settings?.promptTheme ?? "Obscure English words";

  try {
    const word = await generateWord(theme);
    return NextResponse.json(word);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate word. Check your GEMINI_API_KEY." },
      { status: 500 }
    );
  }
}
