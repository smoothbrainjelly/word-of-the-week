import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";
import { redis } from "./redis";

export type Role = "user" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  passwordHash?: string;
};

function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: { userId: string; role: Role }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getJWTSecret());
}

export async function verifyToken(token: string): Promise<{ userId: string; role: Role } | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    return payload as { userId: string; role: Role };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<{ userId: string; role: Role } | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  return verifyToken(session.value);
}

export async function requireAdmin(): Promise<{ userId: string; role: Role } | null> {
  const user = await requireAuth();
  return user?.role === "admin" ? user : null;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === computed;
}

export async function getUsers(): Promise<User[]> {
  return (await redis.get<User[]>("users")) ?? [];
}

export async function getUsersByEmail(email: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.email === email);
}

export async function saveUsers(users: User[]): Promise<void> {
  await redis.set("users", users);
}

export async function createUser(name: string, email: string, password?: string): Promise<User> {
  const users = await getUsers();
  const isFirst = users.length === 0;
  const user: User = {
    id: crypto.randomUUID(),
    name,
    email,
    role: isFirst ? "admin" : "user",
    active: true,
    createdAt: new Date().toISOString(),
    passwordHash: password ? hashPassword(password) : undefined,
  };
  users.push(user);
  await saveUsers(users);
  return user;
}

export async function signEmailToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("90d")
    .sign(getJWTSecret());
}

export async function verifyEmailToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    return (payload as { email: string }).email;
  } catch {
    return null;
  }
}

export async function updateUserPassword(userId: string, password: string): Promise<void> {
  const users = await getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("User not found");
  users[idx].passwordHash = hashPassword(password);
  await saveUsers(users);
}
