import { NextResponse } from "next/server";
import { requireAdmin, getUsers, saveUsers } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const users = await getUsers();
  return NextResponse.json(users);
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, role, active } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const users = await getUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (role !== undefined) users[index].role = role;
  if (active !== undefined) users[index].active = active;

  await saveUsers(users);
  return NextResponse.json(users[index]);
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const users = await getUsers();
  const filtered = users.filter((u) => u.id !== userId);
  if (filtered.length === users.length) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await saveUsers(filtered);
  return NextResponse.json({ success: true });
}
