/**
 * Application route constants
 */

// Public routes (no auth required)
export const PUBLIC_ROUTES = {
  HOME: "/",
} as const;

// Auth routes (redirect to app if authenticated)
export const AUTH_ROUTES = {
  SIGN_IN: "/auth/sign-in",
  SIGN_UP: "/auth/sign-up",
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",
  CALLBACK: "/auth/callback",
} as const;

// Protected routes (require authentication)
export const PROTECTED_ROUTES = {
  TIMELINE: "/timeline",
  ACCOUNT: "/account",
} as const;

// Routes as arrays for middleware matching
export const PROTECTED_ROUTE_PREFIXES = [
  PROTECTED_ROUTES.TIMELINE,
  PROTECTED_ROUTES.ACCOUNT,
] as const;

// Auth route prefix for redirect logic
export const AUTH_ROUTE_PREFIX = "/auth" as const;

// Default redirects
export const REDIRECT = {
  AFTER_SIGN_IN: PROTECTED_ROUTES.TIMELINE,
  AFTER_SIGN_OUT: PUBLIC_ROUTES.HOME,
  UNAUTHENTICATED: AUTH_ROUTES.SIGN_IN,
} as const;
