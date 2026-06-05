import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redis } from "@/lib/redis";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  const payload = await verifyToken(session.value);
  return payload?.role === "admin" ? payload : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = await redis.get<boolean>("force_send");
  return NextResponse.json({ forceSend: !!force });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { forceSend } = await request.json();
  await redis.set("force_send", !!forceSend);
  return NextResponse.json({ forceSend: !!forceSend });
}
