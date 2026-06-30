import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getPoolSize, refillPool } from "@/lib/word-pool";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  const payload = await verifyToken(session.value);
  return payload?.role === "admin" ? payload : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const poolSize = await getPoolSize();
  return NextResponse.json({ poolSize });
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { added, total } = await refillPool();
    const poolSize = await getPoolSize();
    return NextResponse.json({ added, total, poolSize });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/refill-pool] Refill failed:", message);
    return NextResponse.json({ error: "Refill failed", details: message }, { status: 500 });
  }
}
