import { NextResponse } from "next/server";
import { getUsersByEmail, signToken } from "@/lib/auth";

const DEV_EMAIL = "ja63604@gmail.com";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in dev mode" }, { status: 403 });
  }

  const user = await getUsersByEmail(DEV_EMAIL);
  if (!user) {
    return NextResponse.json({ error: "Dev user not found. Sign up first." }, { status: 404 });
  }

  const jwt = await signToken({ userId: user.id, role: user.role });

  const response = NextResponse.json({ user });
  response.cookies.set("session", jwt, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
