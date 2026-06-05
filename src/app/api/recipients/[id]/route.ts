import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import type { Recipient } from "@/lib/types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const recipients = (await redis.get<Recipient[]>("recipients")) ?? [];
  const index = recipients.findIndex((r) => r.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  recipients[index] = {
    ...recipients[index],
    name: body.name ?? recipients[index].name,
    email: body.email ?? recipients[index].email,
    active: body.active ?? recipients[index].active,
  };
  await redis.set("recipients", recipients);
  return NextResponse.json(recipients[index]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recipients = (await redis.get<Recipient[]>("recipients")) ?? [];
  const filtered = recipients.filter((r) => r.id !== id);

  if (filtered.length === recipients.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await redis.set("recipients", filtered);
  return NextResponse.json({ success: true });
}
