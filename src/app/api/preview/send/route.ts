import { NextResponse } from "next/server";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import { generateWord } from "@/lib/gemini";
import { sendEmail } from "@/lib/email";
import { renderHtmlTemplate } from "@/lib/email-template";
import { requireAuth, signEmailToken, getUsers } from "@/lib/auth";
import { getUsedWords, addUsedWord } from "@/lib/used-words";
import { redis } from "@/lib/redis";
import type { HistoryEntry } from "@/lib/types";

const DEFAULT_THEME = "English words that are familiar but not everyday vocabulary — share the word with IPA pronunciation, definition, etymology, and an example sentence";

export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, saveToHistory } = await request.json();

  const theme = DEFAULT_THEME;

  try {
    const usedWords = await getUsedWords();
    const word = await generateWord(theme, usedWords);
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    let sentTo = 0;
    const emails: string[] = [];

    if (email === "__all__") {
      const users = await getUsers();
      for (const u of users.filter((u) => u.active)) {
        emails.push(u.email);
      }
    } else if (email) {
      emails.push(email);
    } else {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    for (const addr of emails) {
      try {
        const unsubToken = await signEmailToken(addr);
        const unsubUrl = `${baseUrl}/unsubscribe?token=${unsubToken}`;
        const { html, text } = renderHtmlTemplate(word, unsubUrl);
        await sendEmail(addr, `Word of the Week: ${word.word}`, text, html);
        sentTo++;
      } catch (e) {
        console.error(`[preview/send] Failed to send to ${addr.slice(0, 3)}***:`, e);
      }
    }

    if (sentTo > 0 && saveToHistory) {
      await addUsedWord(word.word);
      const history = (await (redis as unknown as Redis).get<HistoryEntry[]>("history")) ?? [];
      history.push({
        id: crypto.randomUUID(),
        word: word.word,
        pronunciation: word.pronunciation,
        simple_pronunciation: word.simple_pronunciation,
        definition: word.definition,
        etymology: word.etymology,
        example: word.example,
        sentAt: new Date().toISOString(),
        recipientCount: sentTo,
      });
      await (redis as unknown as Redis).set("history", history);
    }

    return NextResponse.json({ success: true, word: word.word, sentTo });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate or send. Check your API keys." },
      { status: 500 }
    );
  }
}
