import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { PROTECTED_ROUTE_PREFIXES, REDIRECT } from "@/const";

/**
 * Next.js 16 Proxy for route protection.
 *
 * Uses cookie-only check for fast optimistic redirects.
 * Full session validation happens in page components via requireSession().
 *
 * Security Note: getSessionCookie only checks if a cookie exists, not if it's valid.
 * Always validate sessions server-side in protected pages/actions.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a protected route
  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Check for session cookie (fast, no DB call)
  const sessionCookie = getSessionCookie(request);

  // Redirect to sign-in if no session cookie
  if (!sessionCookie) {
    const signInUrl = new URL(REDIRECT.UNAUTHENTICATED, request.url);
    signInUrl.searchParams.set("callbackURL", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except static files and API routes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
