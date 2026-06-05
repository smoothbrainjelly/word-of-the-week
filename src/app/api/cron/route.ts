import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { generateWord } from "@/lib/gemini";
import { sendEmail } from "@/lib/email";
import type { Settings, Recipient, HistoryEntry } from "@/lib/types";

function getDayName(): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
}

function isTimeMatch(time: string): boolean {
  const now = new Date();
  const [h, m] = time.split(":").map(Number);
  return now.getHours() === h && now.getMinutes() === m;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await redis.get<Settings>("settings");
  if (!settings) {
    return NextResponse.json({ error: "No settings configured" }, { status: 400 });
  }

  if (getDayName() !== settings.day || !isTimeMatch(settings.time)) {
    return NextResponse.json({ message: "Not time yet" });
  }

  const recipients = (await redis.get<Recipient[]>("recipients")) ?? [];
  const active = recipients.filter((r) => r.active);
  if (active.length === 0) {
    return NextResponse.json({ error: "No active recipients" }, { status: 400 });
  }

  const word = await generateWord(settings.promptTheme);
  const body = [
    `Your word of the week is: ${word.word}`,
    "",
    `Definition: ${word.definition}`,
    `Etymology: ${word.etymology}`,
    `Example: ${word.example}`,
  ].join("\n");

  for (const recipient of active) {
    await sendEmail(recipient.email, `Word of the Week: ${word.word}`, body);
  }

  const history = (await redis.get<HistoryEntry[]>("history")) ?? [];
  history.push({
    id: crypto.randomUUID(),
    word: word.word,
    definition: word.definition,
    etymology: word.etymology,
    example: word.example,
    sentAt: new Date().toISOString(),
    recipientCount: active.length,
  });
  await redis.set("history", history);

  return NextResponse.json({ success: true, word: word.word, sentTo: active.length });
}
