import { NextResponse } from "next/server";
import crypto from "crypto";
import { redis } from "@/lib/redis";
import { generateWord } from "@/lib/gemini";
import { sendEmail } from "@/lib/email";
import { renderHtmlTemplate } from "@/lib/email-template";
import { getUsers } from "@/lib/auth";
import type { HistoryEntry } from "@/lib/types";

const DEFAULT_SETTINGS = {
  promptTheme: "Obscure English words — share the word, definition, etymology, and an example sentence",
  day: "Friday",
  time: "17:30",
  timezone: "America/New_York",
};

function getDayName(timezone: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: timezone }).format(new Date());
}

function isTimeMatch(time: string, timezone: string): boolean {
  const now = new Date();
  const [h, m] = time.split(":").map(Number);
  const hour = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone }).format(now);
  const minute = new Intl.DateTimeFormat("en-US", { minute: "numeric", timeZone: timezone }).format(now);
  return parseInt(hour) === h && parseInt(minute) === m;
}

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

  if (getDayName(DEFAULT_SETTINGS.timezone) !== DEFAULT_SETTINGS.day || !isTimeMatch(DEFAULT_SETTINGS.time, DEFAULT_SETTINGS.timezone)) {
    return NextResponse.json({ message: "Not time yet" });
  }

  const users = await getUsers();
  const active = users.filter((u) => u.active);
  if (active.length === 0) {
    return NextResponse.json({ error: "No active users" }, { status: 400 });
  }

  const word = await generateWord(DEFAULT_SETTINGS.promptTheme);
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
