import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, getUsers } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const payload = await verifyToken(session.value);
  if (!payload) {
    return NextResponse.json({ user: null });
  }

  const users = await getUsers();
  const user = users.find((u) => u.id === payload.userId);
  if (!user || !user.active) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}
