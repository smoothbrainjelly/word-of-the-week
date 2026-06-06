import { NextResponse } from "next/server";
import { generateWord } from "@/lib/gemini";
import { sendEmail } from "@/lib/email";
import { renderHtmlTemplate } from "@/lib/email-template";
import { requireAuth, signEmailToken } from "@/lib/auth";

const DEFAULT_THEME = "Obscure but easy-to-pronounce English words — share the word with IPA pronunciation, definition, etymology, and an example sentence";

export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const theme = DEFAULT_THEME;

  try {
    const word = await generateWord(theme);
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const unsubToken = await signEmailToken(email);
    const unsubUrl = `${baseUrl}/unsubscribe?token=${unsubToken}`;
    const { html, text } = renderHtmlTemplate(word, unsubUrl);
    await sendEmail(email, `Word of the Week: ${word.word}`, text, html);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate or send. Check your API keys." },
      { status: 500 }
    );
  }
}
