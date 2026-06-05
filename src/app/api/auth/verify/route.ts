import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { consumeMagicToken, getUsersByEmail, signToken } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const email = await consumeMagicToken(token);
  if (!email) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const user = await getUsersByEmail(email);
  if (!user || !user.active) {
    return NextResponse.json({ error: "Account not found or deactivated" }, { status: 403 });
  }

  const jwt = await signToken({ userId: user.id, role: user.role });

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("session", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
