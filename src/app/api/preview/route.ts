import { NextResponse } from "next/server";
import { generateWord } from "@/lib/gemini";
import { requireAuth } from "@/lib/auth";
import { getUsedWords } from "@/lib/used-words";

const DEFAULT_THEME = "English words that are familiar but not everyday vocabulary — share the word with IPA pronunciation, definition, etymology, and an example sentence";

export async function POST() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const theme = DEFAULT_THEME;

  try {
    const usedWords = await getUsedWords();
    const word = await generateWord(theme, usedWords);
    return NextResponse.json(word);
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
