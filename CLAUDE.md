# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

History Portal is a full-stack TypeScript app for exploring historical timelines and maps. Deployed to GCP Cloud Run via Pulumi.

**Structure:**
- `src/` — Next.js 16 app (React 19, App Router) + database layer (Drizzle ORM + Neon)
- `infra/` — Pulumi infrastructure (separate package with its own node_modules)

## Commands

```bash
# Development
pnpm dev                           # Start Next.js dev server (localhost:3000)

# Code quality
pnpm check-types                   # Type-check
pnpm lint                          # ESLint

# Testing
pnpm test                          # Unit/integration tests (Vitest, happy-dom)
pnpm test:watch                    # Watch mode
pnpm test:db                       # Database/RLS tests (Vitest, node env)
pnpm test:e2e                      # Playwright E2E tests

# Database
pnpm db:generate                   # Generate migration from schema changes
pnpm db:migrate:all                # Run migrations + RLS policies
pnpm db:seed                       # Seed test data
pnpm db:studio                     # Open Drizzle Studio
pnpm db:reset:local                # Reset local database (destructive)

# Adding dependencies
pnpm add <pkg>
pnpm add -D <pkg>

# shadcn/ui components
pnpm ui:add <component-name>
```

## Architecture

### Database clients (src/db/client.ts)
Two Neon clients, **lazy-initialized via Proxy** to avoid build-time DB access (DATABASE_URL is a runtime secret in Docker):
- `db` — HTTP client for simple queries (stateless, lower latency)
- `dbPool` — WebSocket pool for transactions and RLS operations

### Row-Level Security (src/db/rls.ts)
- `withRLS(userId, operation)` — Executes in a transaction with `SET LOCAL ROLE app_user` and `SET LOCAL app.user_id`
- `withAdminAccess(operation)` — Bypasses RLS for admin operations
- RLS policies are defined in SQL migration files, applied via `pnpm db:migrate:rls`

### Authentication
Better Auth with session-based auth (HTTP-only cookies), email+password with verification, and Google OAuth. Sessions integrate with PostgreSQL RLS via `app.user_id`.

### API route pattern
API routes importing from `@/db` must have `export const dynamic = "force-dynamic"` to prevent pre-rendering during Docker builds. Each route has a co-located `types.ts` with response types validated using `satisfies`.

## Code Conventions

- **`type` over `interface`** for all TypeScript types
- **Arrow functions** for React components: `export const MyComponent = ({ prop }: Props) => { ... }`
- **Server Components by default** — only add `"use client"` when hooks/events/browser APIs are needed
- **Props type** named `Props` defined directly above the component
- **Kebab-case** for files and folders: `sign-out-button/sign-out-button.tsx`
- **Component folders** with `index.ts` re-exports: `src/components/common/<name>/index.ts`
- **Path alias** `@/*` maps to `src/*`
- **Schema types** via `.$inferSelect` / `.$inferInsert` (Drizzle), not `InferSelectModel`
- **Snake_case** for database table/column names

## Test Users (seeded data)

| User  | Email            | Cards | Purpose          |
|-------|------------------|-------|------------------|
| Alice | alice@test.local | 15    | Primary test user |
| Bob   | bob@test.local   | 10    | Multi-user RLS   |
| Carol | carol@test.local | 0     | Empty state      |
| Admin | admin@test.local | —     | Admin tests      |

Password for all: `Test123!`

## Detailed Documentation

See [docs/](docs/) for deep dives: [ARCHITECTURE.md](docs/ARCHITECTURE.md), [AUTHENTICATION.md](docs/AUTHENTICATION.md), [CONVENTIONS.md](docs/CONVENTIONS.md), [TESTING.md](docs/TESTING.md), [INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md), [CI-CD.md](docs/CI-CD.md).
