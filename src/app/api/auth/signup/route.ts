import { NextResponse } from "next/server";
import { getUsersByEmail, createUser, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { name, email, password } = await request.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await getUsersByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const user = await createUser(name, email, password);
  const jwt = await signToken({ userId: user.id, role: user.role });

  const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active } });
  response.cookies.set("session", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
