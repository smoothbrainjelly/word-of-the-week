import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, getUsers, saveUsers } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await verifyToken(session.value);
  if (!payload) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const users = await getUsers();
  const idx = users.findIndex((u) => u.id === payload.userId);
  if (idx === -1) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  users[idx].active = !users[idx].active;
  await saveUsers(users);

  return NextResponse.json({ active: users[idx].active });
}
