import { NextResponse } from "next/server";
import { enrichWord } from "@/lib/gemini";
import { requireAuth } from "@/lib/auth";
import { previewWord, refillPool } from "@/lib/word-pool";

export async function POST() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let wordStr = await previewWord();
    if (!wordStr) {
      await refillPool();
      wordStr = await previewWord();
    }
    if (!wordStr) {
      return NextResponse.json({ error: "No words available. Please refill the pool." }, { status: 500 });
    }
    const result = await enrichWord(wordStr);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Preview generation failed:", message);

    if (message.includes("API_KEY") || message.includes("API key")) {
      return NextResponse.json(
        { error: "Missing or invalid GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    if (message.includes("quota") || message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
      return NextResponse.json(
        { error: "Gemini API quota exhausted. Try again later or upgrade your plan." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate word. Check your Gemini API key and quota." },
      { status: 500 }
    );
  }
}
