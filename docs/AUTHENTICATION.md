# Authentication System

> **Purpose:** Comprehensive documentation of the Better Auth implementation in this project. Serves as context for AI assistants and developer reference.

**Last Updated:** December 20, 2025  
**Status:** ✅ Implementation Complete

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Decisions](#2-architecture-decisions)
3. [Auth Flow](#3-auth-flow)
4. [Session & Cookie Lifecycle](#4-session--cookie-lifecycle)
5. [Project Structure](#5-project-structure)
6. [Database Schema](#6-database-schema)
7. [Server Configuration](#7-server-configuration)
8. [Client Configuration](#8-client-configuration)
9. [Auth Components](#9-auth-components)
10. [Route Protection](#10-route-protection)
11. [Row Level Security (RLS)](#11-row-level-security-rls)
12. [Environment Variables](#12-environment-variables)
13. [Setup Checklist](#13-setup-checklist)
14. [Common Patterns](#14-common-patterns)

---

## 1. Overview

This project uses [Better Auth](https://www.better-auth.com/) for authentication with:

- **Email/Password** authentication with email verification
- **Google OAuth** social login
- **Session-based** authentication (not JWT)
- **Drizzle ORM** adapter for database integration
- **Custom auth components** with Server Actions for progressive enhancement
- **Resend** for transactional emails

### Key Packages

| Package       | Version | Purpose                     |
| ------------- | ------- | --------------------------- |
| `better-auth` | ^1.4.7  | Core authentication library |
| `zod`         | ^4.2.1  | Form validation schemas     |
| `resend`      | ^4.5.1  | Email delivery service      |

---

## 2. Architecture Decisions

### Why Better Auth over Neon Auth?

| Consideration      | Better Auth                 | Neon Auth             |
| ------------------ | --------------------------- | --------------------- |
| **Portability**    | ✅ Works with any database  | ❌ Tied to Neon       |
| **Control**        | ✅ Full control over schema | ⚠️ Pre-defined schema |
| **Customization**  | ✅ Highly customizable      | ⚠️ Limited options    |
| **Vendor lock-in** | ✅ None                     | ❌ Neon-specific      |

**Decision:** Use Better Auth for maximum portability and control.

### Why Custom Components over better-auth-ui?

| Consideration               | Custom Components                   | better-auth-ui                |
| --------------------------- | ----------------------------------- | ----------------------------- |
| **React 19 Compatibility**  | ✅ Native support                   | ❌ RSC boundary issues        |
| **Progressive Enhancement** | ✅ Server Actions, works without JS | ❌ Client-only                |
| **Turbopack Compatibility** | ✅ No issues                        | ❌ Module resolution problems |
| **Bundle Size**             | ✅ Minimal                          | ⚠️ Adds dependencies          |
| **Customization**           | ✅ Full control                     | ⚠️ Theme-based                |

**Decision:** Use custom auth components with Server Actions for React 19 compatibility and progressive enhancement.

### Why Session-Based RLS over JWT Claims?

| Approach                   | Pros                               | Cons                                 |
| -------------------------- | ---------------------------------- | ------------------------------------ |
| **Session-based (chosen)** | Works with any auth, simpler setup | Extra DB call per request            |
| **JWT claims**             | Single source of truth             | Requires Neon Auth, harder to revoke |

**Decision:** Use session-based RLS via `SET LOCAL app.user_id = '<uuid>'` for portability.

---

## 3. Auth Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SIGN UP FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User → /auth/sign-up → Better Auth API → Create user + account             │
│                              ↓                                              │
│                    Send verification email (Resend + EmailTemplate)         │
│                              ↓                                              │
│  User clicks link → /api/auth/verify-email?token=xxx → Verify email         │
│                              ↓                                              │
│                    Create session → Redirect to /timeline                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              SIGN IN FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User → /auth/sign-in → Better Auth API → Validate credentials              │
│                              ↓                                              │
│                    Create session → Set cookie → Redirect to /timeline      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROTECTED ROUTE FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Request → Middleware → Check session cookie                                │
│                              ↓                                              │
│              ┌─────────────────────────────────┐                            │
│              │ Session valid?                  │                            │
│              ├────────────────┬────────────────┤                            │
│              │ YES            │ NO             │                            │
│              ↓                ↓                │                            │
│         Continue          Redirect to          │                            │
│         to page           /auth/sign-in        │                            │
│              │                                 │                            │
│              ↓                                 │                            │
│  Server Component: requireSession() → userId   │                            │
│              ↓                                 │                            │
│  withRLS(userId, async (db) => { ... })        │                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Session & Cookie Lifecycle

This section explains how Better Auth manages sessions and cookies in a Next.js Server Components environment.

### Cookie Overview

Better Auth uses an HTTP-only session cookie (`better-auth.session_token`) to maintain authentication state:

| Property    | Value                                         |
| ----------- | --------------------------------------------- |
| Cookie Name | `better-auth.session_token`                   |
| HttpOnly    | `true` (not accessible via JavaScript)        |
| Secure      | `true` in production (HTTPS only)             |
| SameSite    | `lax`                                         |
| Path        | `/`                                           |
| Max-Age     | 7 days (configurable via `session.expiresIn`) |

### The Complete Cookie Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         1. USER SUBMITS SIGN-IN FORM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Browser → POST form data → Server Action (signInAction)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                   2. SERVER ACTION CALLS BETTER AUTH API                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  await auth.api.signInEmail({                                               │
│    body: { email, password }                                                │
│  });                                                                        │
│                                                                             │
│  Better Auth:                                                               │
│  1. Validates credentials against database                                  │
│  2. Creates session record in `session` table                               │
│  3. Generates session token                                                 │
│  4. WANTS to set cookie, but Server Actions can't set cookies directly...   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│               3. nextCookies PLUGIN INTERCEPTS AND SETS COOKIE              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  The `nextCookies()` plugin (configured in auth/index.tsx) hooks into       │
│  Better Auth's response and uses Next.js's `cookies()` API:                 │
│                                                                             │
│  // What nextCookies does internally:                                       │
│  import { cookies } from "next/headers";                                    │
│  const cookieStore = await cookies();                                       │
│  cookieStore.set("better-auth.session_token", token, options);              │
│                                                                             │
│  This bridges Better Auth ↔ Next.js Server Actions cookie handling.         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                   4. SERVER ACTION REDIRECTS TO /timeline                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  redirect("/timeline");  // From next/navigation                            │
│                                                                             │
│  Response includes Set-Cookie header with session token.                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                       5. BROWSER STORES COOKIE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Browser receives Set-Cookie header and stores:                             │
│  better-auth.session_token=<token>; HttpOnly; Secure; SameSite=Lax          │
│                                                                             │
│  Cookie is now stored and will be sent with ALL subsequent requests.        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                   6. SUBSEQUENT REQUESTS (Page Load/Refresh)                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Browser → GET /timeline (Cookie: better-auth.session_token=xxx)            │
│                                                                             │
│  Next.js makes cookie available via:                                        │
│  - `headers()` function (contains Cookie header)                            │
│  - `cookies()` function (parsed cookies)                                    │
│  - Request object in proxy.ts                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          7. TWO-LAYER VALIDATION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYER 1: proxy.ts (fast, cookie-only)                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  const sessionCookie = getSessionCookie(request);                   │    │
│  │  // Just checks: does the cookie EXIST? (no DB call)                │    │
│  │  if (!sessionCookie && isProtectedRoute) redirect("/auth/sign-in"); │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              ↓                                              │
│  LAYER 2: requireSession() in page (secure, DB-validated)                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  const session = await auth.api.getSession({                        │    │
│  │    headers: await headers()                                         │    │
│  │  });                                                                 │    │
│  │  // Parses token → queries DB → validates expiry → returns session  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Functions Explained

#### `getSessionCookie(request)` — Fast Cookie Check

```typescript
import { getSessionCookie } from "better-auth/cookies";

// In proxy.ts
const sessionCookie = getSessionCookie(request);
```

- **Purpose**: Quick check for cookie existence
- **Returns**: The raw cookie value or `undefined`
- **Performance**: No database call, just parses the Cookie header
- **Use case**: Optimistic route protection in proxy

#### `headers()` — Access Request Headers

```typescript
import { headers } from "next/headers";

const session = await auth.api.getSession({
  headers: await headers(),
});
```

- **Purpose**: Provide request context to Better Auth
- **Why needed**: Server Components don't have direct request access
- **What it contains**: All HTTP headers including the Cookie header

#### `nextCookies()` Plugin — Server Action Cookie Bridge

```typescript
// In auth/index.tsx
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  plugins: [nextCookies()],
  // ...
});
```

- **Purpose**: Enable cookie operations in Server Actions
- **Why needed**: Server Actions can't access response headers directly
- **How it works**: Hooks into Better Auth and uses `cookies().set()` from `next/headers`

#### `requireSession()` — Validated Session with Redirect

```typescript
import { requireSession } from "@/lib/auth/session";

export default async function ProtectedPage() {
  const { user } = await requireSession();
  // If we get here, session is valid and user exists
}
```

- **Purpose**: Full session validation with automatic redirect
- **Database call**: Yes, queries the `session` table
- **On invalid/expired**: Redirects to `/auth/sign-in`

### Cookie vs Database: When Each is Used

| Operation            | Cookie Only      | Database Query |
| -------------------- | ---------------- | -------------- |
| `getSessionCookie()` | ✅               | ❌             |
| `getSession()`       | ✅ (reads token) | ✅ (validates) |
| `requireSession()`   | ✅ (reads token) | ✅ (validates) |
| Sign in/Sign up      | ❌               | ✅ (creates)   |
| Sign out             | ✅ (deletes)     | ✅ (deletes)   |

### Why Two Layers?

| Layer                | Speed      | Security      | Purpose                                              |
| -------------------- | ---------- | ------------- | ---------------------------------------------------- |
| **proxy.ts**         | ⚡ Fast    | ⚠️ Optimistic | Prevent obvious unauthenticated access, good UX      |
| **requireSession()** | 🐢 DB call | ✅ Secure     | Actual validation, prevents expired/revoked sessions |

The proxy catches 99% of unauthenticated requests without a database call. The page-level check ensures security even if someone has an expired or revoked cookie.

---

## 5. Project Structure

```
packages/
├── db/
│   ├── src/
│   │   ├── schema/
│   │   │   ├── index.ts          # Re-exports all schemas
│   │   │   └── auth.ts           # Better Auth tables (user, session, account, verification)
│   │   ├── rls.ts                # withRLS() and withAdminAccess() helpers
│   │   └── ...
│   ├── migrations/
│   │   ├── 0000_*.sql            # Initial migration (Drizzle-generated)
│   │   └── rls-policies.sql      # RLS functions (manual, idempotent)
│   └── scripts/
│       ├── migrate-rls.ts        # Run RLS migration
│       ├── reset-local.ts        # Reset local Docker database
│       └── reset-staging.ts      # Reset Neon staging database
│
└── portal/
    └── src/
        ├── lib/
        │   └── auth/
        │       ├── index.tsx         # Better Auth server config
        │       ├── client.ts         # Client-side auth config (social login)
        │       ├── session.ts        # getSession(), requireSession() helpers
        │       └── email-template.tsx # Custom React email template
        ├── app/
        │   ├── api/
        │   │   └── auth/
        │   │       └── [...all]/
        │   │           └── route.ts   # Better Auth API handler
        │   └── auth/
        │       ├── sign-in/page.tsx       # Sign in page
        │       ├── sign-up/page.tsx       # Sign up page
        │       ├── forgot-password/page.tsx   # Forgot password page
        │       └── reset-password/page.tsx    # Reset password page
        ├── components/
        │   └── auth/
        │       ├── index.ts              # Re-exports all auth components
        │       ├── actions.ts            # Server Actions for form handling
        │       ├── schemas.ts            # Zod 4 validation schemas
        │       ├── sign-in-form.tsx      # Sign in form component
        │       ├── sign-up-form.tsx      # Sign up form component
        │       ├── forgot-password-form.tsx  # Forgot password form
        │       └── reset-password-form.tsx   # Reset password form
        ├── proxy.ts                   # Route protection (Next.js 16+)
        └── const/
            └── routes.ts              # Centralized route constants
```

---

## 6. Database Schema

Better Auth requires four tables, defined in [packages/db/src/schema/auth.ts](../packages/db/src/schema/auth.ts):

### Tables

| Table          | Purpose                                     |
| -------------- | ------------------------------------------- |
| `user`         | User profiles (id, email, name, role, etc.) |
| `session`      | Active sessions (linked to user)            |
| `account`      | Auth providers (email, google, etc.)        |
| `verification` | Email verification tokens                   |

### Schema Notes

- All tables use **UUID** primary keys with `defaultRandom()`
- Column names are explicitly **snake_case** (required by Better Auth)
- `user.role` field added for role-based access control (default: `'user'`)
- Auth tables do **NOT** have RLS policies (Better Auth manages them internally)

### User Roles

```typescript
export type UserRole = "user" | "admin";
```

---

## 7. Server Configuration

Located at [packages/portal/src/lib/auth/index.tsx](../packages/portal/src/lib/auth/index.tsx).

Configures:

- Drizzle adapter with PostgreSQL
- Email/password with verification via Resend + `EmailTemplate`
- Google OAuth social provider
- Session expiry (7 days) with daily refresh
- **`nextCookies` plugin** for Server Action cookie handling

---

## 8. Client Configuration

| File                                                                                | Purpose                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------- |
| [packages/portal/src/lib/auth/client.ts](../packages/portal/src/lib/auth/client.ts) | Auth client for social login (Google OAuth) |

The client is used only for social login buttons, which require client-side JavaScript to redirect to the OAuth provider.

---

## 9. Auth Components

Custom auth components using Server Actions for progressive enhancement (forms work without JavaScript).

### Components

| Component                                                                             | Purpose                   |
| ------------------------------------------------------------------------------------- | ------------------------- |
| [SignInForm](../packages/portal/src/components/auth/sign-in-form.tsx)                 | Email/password sign in    |
| [SignUpForm](../packages/portal/src/components/auth/sign-up-form.tsx)                 | Account registration      |
| [ForgotPasswordForm](../packages/portal/src/components/auth/forgot-password-form.tsx) | Request password reset    |
| [ResetPasswordForm](../packages/portal/src/components/auth/reset-password-form.tsx)   | Reset password with token |

### Supporting Files

| File                                                            | Purpose                                 |
| --------------------------------------------------------------- | --------------------------------------- |
| [actions.ts](../packages/portal/src/components/auth/actions.ts) | Server Actions for all form submissions |
| [schemas.ts](../packages/portal/src/components/auth/schemas.ts) | Zod 4 validation schemas                |

### Progressive Enhancement

Forms use React 19's `useActionState` hook for:

- ✅ Forms submit and validate without JavaScript
- ✅ Field-level error messages via `state.fieldErrors`
- ✅ Form values preserved on error via `state.values`
- ✅ Loading states with `isPending`
- ✅ Server-side redirect on success

See [sign-in-form.tsx](../packages/portal/src/components/auth/sign-in-form.tsx) for the implementation pattern.

---

## 10. Route Protection

### Two-Layer Protection Strategy

1. **Proxy (fast, optimistic)**: Uses `getSessionCookie()` to check cookie existence only - no DB call
2. **Page (secure, validated)**: Uses `requireSession()` to validate session against database

| File                                                     | Purpose                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| [proxy.ts](../packages/portal/src/proxy.ts)              | Fast cookie check, optimistic redirect for unauthenticated    |
| [session.ts](../packages/portal/src/lib/auth/session.ts) | `getSession()` and `requireSession()` with full DB validation |
| [routes.ts](../packages/portal/src/const/routes.ts)      | Centralized route constants                                   |

### Security Note

The proxy only checks for cookie **existence**, not validity. Always use `requireSession()` in protected pages to validate the session against the database.

---

## 11. Row Level Security (RLS)

### Approach

1. **Auth tables**: No RLS (Better Auth manages internally)
2. **Domain tables**: RLS enabled, policies use session variables

### Session Variables

```sql
SET LOCAL app.user_id = '<user-uuid>';
SET LOCAL app.is_admin = 'true';  -- Optional, for admin bypass
```

### Key Files

| File                                                           | Purpose                                     |
| -------------------------------------------------------------- | ------------------------------------------- |
| [rls-policies.sql](../packages/db/migrations/rls-policies.sql) | PostgreSQL RLS functions                    |
| [rls.ts](../packages/db/src/rls.ts)                            | `withRLS()` and `withAdminAccess()` helpers |

### Adding RLS to Domain Tables

When you create domain tables with a `user_id` column, add policies:

```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE your_table FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON your_table
  FOR SELECT USING (user_id = current_app_user_id() OR is_app_admin());

CREATE POLICY "Users can insert own data" ON your_table
  FOR INSERT WITH CHECK (user_id = current_app_user_id());

CREATE POLICY "Users can update own data" ON your_table
  FOR UPDATE USING (user_id = current_app_user_id() OR is_app_admin())
  WITH CHECK (user_id = current_app_user_id());

CREATE POLICY "Users can delete own data" ON your_table
  FOR DELETE USING (user_id = current_app_user_id() OR is_app_admin());
```

---

## 12. Environment Variables

### Required for Portal

| Variable               | Description                               | Example                                          |
| ---------------------- | ----------------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`         | Neon connection string                    | `postgresql://user:pass@host/db?sslmode=require` |
| `BETTER_AUTH_SECRET`   | Secret for session signing (min 32 chars) | Generate with `openssl rand -base64 32`          |
| `BETTER_AUTH_URL`      | Base URL for auth (email links, cookies)  | `http://localhost:3000`                          |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                    | `xxx.apps.googleusercontent.com`                 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                | `GOCSPX-xxx`                                     |
| `RESEND_API_KEY`       | Resend API key for emails                 | `re_xxx`                                         |
| `EMAIL_FROM`           | Sender email address                      | `noreply@yourdomain.com`                         |

> **Important:** `BETTER_AUTH_URL` must be set explicitly. Better Auth cannot auto-detect the URL in async contexts (e.g., when sending verification emails from Server Actions).

### Local Development

For local development with Docker PostgreSQL, `DATABASE_URL` can be omitted—the db package falls back to local defaults.

Create `packages/portal/.env.local`:

```bash
# Auth
BETTER_AUTH_SECRET="your-32-char-secret-here-for-local-dev"
BETTER_AUTH_URL="http://localhost:3000"

# Google OAuth (optional for local)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email (optional - URLs logged to console without this)
RESEND_API_KEY="re_your_resend_api_key"
EMAIL_FROM="noreply@yourdomain.com"
```

### Staging/Production (Pulumi)

Secrets are managed via Pulumi config (encrypted in state). Set them once per stack:

```bash
# Generate and set auth secret
pulumi -C infra config set --secret betterAuthSecret "$(openssl rand -base64 32)" --stack staging

# Google OAuth
pulumi -C infra config set --secret googleClientId "xxx.apps.googleusercontent.com" --stack staging
pulumi -C infra config set --secret googleClientSecret "GOCSPX-xxx" --stack staging

# Resend
pulumi -C infra config set --secret resendApiKey "re_xxx" --stack staging

# Non-secret config
pulumi -C infra config set emailFrom "onboarding@resend.dev" --stack staging

# App URL (set after first deploy, or use custom domain)
pulumi -C infra config set appUrl "https://portal-staging-xxx.run.app" --stack staging
```

These are automatically passed to Cloud Run as environment variables during deployment.

---

## 13. Setup Checklist

### First-Time Setup

- [ ] Install dependencies: `pnpm install`
- [ ] Start local database: `pnpm db:up`
- [ ] Run migrations: `pnpm db:migrate:all`
- [ ] Create `packages/portal/.env.local` with required variables
- [ ] Generate `BETTER_AUTH_SECRET`: `openssl rand -base64 32`

### External Services Setup

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Navigate to APIs & Services → Credentials
4. Create OAuth 2.0 Client ID
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env.local`

#### Resend (Email)

1. Go to [Resend](https://resend.com/)
2. Create an account
3. Add and verify your domain
4. Create an API key
5. Copy API key to `.env.local`

---

## 14. Common Patterns

| Pattern                        | How                                                                        |
| ------------------------------ | -------------------------------------------------------------------------- |
| **Protected Server Component** | `const { user } = await requireSession();`                                 |
| **Optional Auth Check**        | `const session = await getSession();`                                      |
| **Protected API Route**        | `const session = await auth.api.getSession({ headers: await headers() });` |
| **Database Query with RLS**    | `await withRLS(user.id, async (db) => { ... });`                           |
| **Social Login (Client)**      | `signIn.social({ provider: "google", callbackURL: "/dashboard" });`        |

See [packages/portal/src/app/timeline/page.tsx](../packages/portal/src/app/timeline/page.tsx) for a working example.

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Overall project architecture
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — Pulumi & GCP setup guide
