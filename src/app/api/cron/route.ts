import { NextResponse } from "next/server";
import crypto from "crypto";
import { redis } from "@/lib/redis";
import { generateWord } from "@/lib/gemini";
import { sendEmail } from "@/lib/email";
import { renderHtmlTemplate } from "@/lib/email-template";
import { getUsers } from "@/lib/auth";
import type { HistoryEntry } from "@/lib/types";

const PROMPT_THEME = "Obscure English words — share the word, definition, etymology, and an example sentence";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!auth || !crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekKey = weekStart.toISOString().slice(0, 10);

  const lastSent = await redis.get<string>("last_sent_week");
  if (lastSent === weekKey) {
    return NextResponse.json({ message: "Already sent this week" });
  }

  const users = await getUsers();
  const active = users.filter((u) => u.active);
  if (active.length === 0) {
    return NextResponse.json({ error: "No active users" }, { status: 400 });
  }

  const word = await generateWord(PROMPT_THEME);
  const { html, text } = renderHtmlTemplate(word);

  let sentCount = 0;
  for (const user of active) {
    try {
      await sendEmail(user.email, `Word of the Week: ${word.word}`, text, html);
      sentCount++;
    } catch (e) {
      console.error(`Failed to send to ${user.email}:`, e);
    }
  }

  if (sentCount > 0) {
    const history = (await redis.get<HistoryEntry[]>("history")) ?? [];
    history.push({
      id: crypto.randomUUID(),
      word: word.word,
      definition: word.definition,
      etymology: word.etymology,
      example: word.example,
      sentAt: now.toISOString(),
      recipientCount: sentCount,
    });
    await redis.set("history", history);
    await redis.set("last_sent_week", weekKey);
  }

  return NextResponse.json({ success: true, word: word.word, sentTo: sentCount });
}
