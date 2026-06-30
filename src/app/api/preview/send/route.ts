import { NextResponse } from "next/server";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import { sendEmail } from "@/lib/email";
import { renderHtmlTemplate } from "@/lib/email-template";
import { requireAuth, signEmailToken, getUsers } from "@/lib/auth";
import { addUsedWord, removeFromPool } from "@/lib/word-pool";
import { redis } from "@/lib/redis";
import type { HistoryEntry, WordResult } from "@/lib/types";

export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, saveToHistory, word } = await request.json();

  if (!word || !word.word) {
    return NextResponse.json({ error: "Word data is required" }, { status: 400 });
  }

  const providedWord = word as WordResult;
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
      const { html, text } = renderHtmlTemplate(providedWord, unsubUrl);
      await sendEmail(addr, `Word of the Week: ${providedWord.word}`, text, html);
      sentTo++;
    } catch (e) {
      console.error(`[preview/send] Failed to send to ${addr.slice(0, 3)}***:`, e);
    }
  }

  if (sentTo > 0 && saveToHistory) {
    await addUsedWord(providedWord.word);
    await removeFromPool(providedWord.word);
    const history = (await (redis as unknown as Redis).get<HistoryEntry[]>("history")) ?? [];
    history.push({
      id: crypto.randomUUID(),
      word: providedWord.word,
      pronunciation: providedWord.pronunciation,
      simple_pronunciation: providedWord.simple_pronunciation,
      definition: providedWord.definition,
      etymology: providedWord.etymology,
      example: providedWord.example,
      sentAt: new Date().toISOString(),
      recipientCount: sentTo,
    });
    await (redis as unknown as Redis).set("history", history);
  }

  return NextResponse.json({ success: true, word: providedWord.word, sentTo });
}
