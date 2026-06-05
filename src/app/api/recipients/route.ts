import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import type { Recipient } from "@/lib/types";

export async function GET() {
  const recipients = (await redis.get<Recipient[]>("recipients")) ?? [];
  return NextResponse.json(recipients);
}

export async function POST(request: Request) {
  const { name, email } = await request.json();
  const recipients = (await redis.get<Recipient[]>("recipients")) ?? [];

  if (recipients.some((r) => r.email === email)) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const newRecipient: Recipient = {
    id: crypto.randomUUID(),
    name,
    email,
    active: true,
  };

  recipients.push(newRecipient);
  await redis.set("recipients", recipients);
  return NextResponse.json(newRecipient, { status: 201 });
}
