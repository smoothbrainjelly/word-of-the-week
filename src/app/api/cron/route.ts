import { NextResponse } from "next/server";
import crypto from "crypto";
import { redis } from "@/lib/redis";
import { generateWord } from "@/lib/gemini";
import { sendEmail } from "@/lib/email";
import { renderHtmlTemplate } from "@/lib/email-template";
import { getUsers, signEmailToken } from "@/lib/auth";
import type { HistoryEntry } from "@/lib/types";

const PROMPT_THEME = "English words that are familiar but not everyday vocabulary — share the word with IPA pronunciation, definition, etymology, and an example sentence";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!auth || auth.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    console.warn("[cron] Unauthorized attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  console.log("[cron] Starting", { time: now.toISOString() });

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekKey = weekStart.toISOString().slice(0, 10);

  const forceSend = await redis.get<boolean>("force_send");
  if (forceSend) {
    console.log("[cron] Force-send enabled, skipping week check");
  } else {
    const lastSent = await redis.get<string>("last_sent_week");
    if (lastSent === weekKey) {
      console.log("[cron] Already sent this week", { weekKey });
      return NextResponse.json({ message: "Already sent this week" });
    }
  }

  const users = await getUsers();
  const active = users.filter((u) => u.active);
  if (active.length === 0) {
    console.warn("[cron] No active users found");
    return NextResponse.json({ error: "No active users" }, { status: 400 });
  }

  console.log("[cron] Active users", { count: active.length });

  const word = await generateWord(PROMPT_THEME);
  console.log("[cron] Word generated", { word: word.word });

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  let sentCount = 0;
  for (const user of active) {
    try {
      const unsubToken = await signEmailToken(user.email);
      const unsubUrl = `${baseUrl}/unsubscribe?token=${unsubToken}`;
      const { html, text } = renderHtmlTemplate(word, unsubUrl);
      await sendEmail(user.email, `Word of the Week: ${word.word}`, text, html);
      sentCount++;
    } catch (e) {
      console.error(`[cron] Failed to send to ${user.email}:`, e);
    }
  }

  if (sentCount > 0) {
    const history = (await redis.get<HistoryEntry[]>("history")) ?? [];
    history.push({
      id: crypto.randomUUID(),
      word: word.word,
      pronunciation: word.pronunciation,
      simple_pronunciation: word.simple_pronunciation,
      definition: word.definition,
      etymology: word.etymology,
      example: word.example,
      sentAt: now.toISOString(),
      recipientCount: sentCount,
    });
    await redis.set("history", history);
    await redis.set("last_sent_week", weekKey);
  }

  console.log("[cron] Done", { sentCount, total: active.length });
  return NextResponse.json({ success: true, word: word.word, sentTo: sentCount });
}
