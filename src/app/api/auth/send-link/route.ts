import { NextResponse } from "next/server";
import { getUsersByEmail, createUser, generateMagicToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  const { name, email } = await request.json();
  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const existing = await getUsersByEmail(email);
  if (!existing) {
    await createUser(name, email);
  } else if (!existing.active) {
    return NextResponse.json({ error: "Account is deactivated" }, { status: 403 });
  }

  const token = await generateMagicToken(email);
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const magicLink = `${baseUrl}/auth/verify?token=${token}`;

  await sendEmail(
    email,
    "Sign in to Word of the Week",
    `Click here to sign in:\n${magicLink}\n\nThis link expires in 15 minutes.`
  );

  return NextResponse.json({ message: "Magic link sent" });
}
