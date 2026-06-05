import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import type { Settings } from "@/lib/types";

const DEFAULT_SETTINGS: Settings = {
  promptTheme: "Obscure English words — share the word, definition, etymology, and an example sentence",
  day: "Monday",
  time: "09:00",
  timezone: "America/New_York",
};

export async function GET() {
  const settings = await redis.get<Settings>("settings");
  return NextResponse.json(settings ?? DEFAULT_SETTINGS);
}

export async function PUT(request: Request) {
  const body = await request.json();

  const VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  if (body.day && !VALID_DAYS.includes(body.day)) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }
  if (body.time && !/^\d{2}:\d{2}$/.test(body.time)) {
    return NextResponse.json({ error: "Invalid time format (use HH:mm)" }, { status: 400 });
  }

  const settings: Settings = {
    promptTheme: body.promptTheme ?? DEFAULT_SETTINGS.promptTheme,
    day: body.day ?? DEFAULT_SETTINGS.day,
    time: body.time ?? DEFAULT_SETTINGS.time,
    timezone: body.timezone ?? DEFAULT_SETTINGS.timezone,
  };
  await redis.set("settings", settings);
  return NextResponse.json(settings);
}
