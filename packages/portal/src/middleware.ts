import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PROTECTED_ROUTE_PREFIXES, REDIRECT } from "@/const";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a protected route
  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Redirect to sign-in if accessing protected route without session
  if (!session) {
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
