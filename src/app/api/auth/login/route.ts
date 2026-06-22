import { NextResponse } from "next/server";
import { getUsersByEmail, verifyPassword, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await getUsersByEmail(email);
  if (!user || !user.active) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "This account has no password set. Please sign up again or contact support." },
      { status: 401 }
    );
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

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
