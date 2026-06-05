import { NextResponse } from "next/server";
import { generateWord } from "@/lib/gemini";

const DEFAULT_THEME = "Obscure English words — share the word, definition, etymology, and an example sentence";

export async function POST() {
  const theme = DEFAULT_THEME;

  try {
    const word = await generateWord(theme);
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
      { error: `Failed to generate word: ${message}` },
      { status: 500 }
    );
  }
}
