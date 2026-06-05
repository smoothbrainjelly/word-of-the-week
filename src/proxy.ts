import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

const AUTH_PATHS = ["/", "/history"];
const ADMIN_PATHS = ["/schedule", "/prompts", "/preview", "/users", "/recipients"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthPath = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAdminPath = ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!isAuthPath && !isAdminPath) {
    return NextResponse.next();
  }

  const session = request.cookies.get("session");
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(session.value);
  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAdminPath && payload.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
