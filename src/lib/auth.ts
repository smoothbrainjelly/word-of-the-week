import { SignJWT, jwtVerify } from "jose";
import { redis } from "./redis";

export type Role = "user" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
};

export type MagicToken = {
  email: string;
  expiresAt: number;
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

export async function createUser(name: string, email: string): Promise<User> {
  const users = await getUsers();
  const isFirst = users.length === 0;
  const user: User = {
    id: crypto.randomUUID(),
    name,
    email,
    role: isFirst ? "admin" : "user",
    active: true,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await saveUsers(users);
  return user;
}

export async function generateMagicToken(email: string): Promise<string> {
  const token = crypto.randomUUID();
  const doc: MagicToken = { email, expiresAt: Date.now() + 15 * 60 * 1000 };
  const tokens = (await redis.get<Record<string, MagicToken>>("magic_tokens")) ?? {};
  tokens[token] = doc;
  await redis.set("magic_tokens", tokens);
  return token;
}

export async function consumeMagicToken(token: string): Promise<string | null> {
  const tokens = (await redis.get<Record<string, MagicToken>>("magic_tokens")) ?? {};
  const doc = tokens[token];
  if (!doc) return null;
  delete tokens[token];
  await redis.set("magic_tokens", tokens);
  if (Date.now() > doc.expiresAt) return null;
  return doc.email;
}
