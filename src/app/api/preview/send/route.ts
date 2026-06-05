import { NextResponse } from "next/server";
import { generateWord } from "@/lib/gemini";
import { sendEmail } from "@/lib/email";
import { redis } from "@/lib/redis";
import type { Settings } from "@/lib/types";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const settings = await redis.get<Settings>("settings");
  const theme = settings?.promptTheme ?? "Obscure English words";

  try {
    const word = await generateWord(theme);
    const body = [
      `Your word of the week is: ${word.word}`,
      "",
      `Definition: ${word.definition}`,
      `Etymology: ${word.etymology}`,
      `Example: ${word.example}`,
    ].join("\n");

    await sendEmail(email, `Word of the Week: ${word.word}`, body);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate or send. Check your API keys." },
      { status: 500 }
    );
  }
}
