import { NextResponse } from "next/server";
import { verifyEmailToken, getUsersByEmail, getUsers, saveUsers } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const email = await verifyEmailToken(token);
  if (!email) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const user = await getUsersByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.active) {
    return NextResponse.json({ message: "Already unsubscribed" });
  }

  user.active = false;
  const users = await getUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  users[idx].active = false;
  await saveUsers(users);

  return NextResponse.json({ message: "Unsubscribed successfully", email });
}
