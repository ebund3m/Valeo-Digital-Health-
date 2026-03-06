import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Always allow onboarding through ──────────────────────────────────────
  if (pathname.startsWith("/onboarding")) {
    return NextResponse.next();
  }

  // Check for Firebase auth token in cookies
  const token = request.cookies.get("__session")?.value ||
                request.cookies.get("token")?.value;

  // ── Protect dashboard routes ──────────────────────────────────────────────
  const protectedPaths = ["/client", "/doctor", "/admin"];
  const isProtected = protectedPaths.some(p => pathname.startsWith(p));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Auth pages: don't block if user has token ─────────────────────────────
  // We let the login/register pages handle their own redirects based on role
  // (middleware can't read Firestore so we can't role-check here)
  const authPaths = ["/login", "/register"];
  const isAuthPage = authPaths.some(p => pathname.startsWith(p));
  if (isAuthPage && token) {
    // Let the page itself handle the redirect — do NOT force to /client
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/client/:path*",
    "/doctor/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/onboarding/:path*",
  ],
};
