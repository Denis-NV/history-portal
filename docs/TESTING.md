# Testing Guide

This document outlines the testing strategy, conventions, and setup for the History Portal project.

## Testing Strategy Summary

Three tiers:

| Tier | Command | Environment | DB |
| ---- | ------- | ----------- | -- |
| Unit / Component | `pnpm test` | happy-dom | None |
| Integration | `pnpm test:integration` | node | Testcontainer |
| E2E | `pnpm test:e2e` | Browser | Testcontainer |

| What to test | Unit/Component | Integration | E2E |
| ------------------------------------------ | :---: | :---: | :---: |
| Pure functions (utils, formatters) | ✅ | — | — |
| Validation schemas (Zod) | ✅ | — | — |
| Client component rendering (state-driven) | ✅ | — | — |
| Server Actions (`"use server"`) | ✅ (mock auth) | ✅ (real DB) | ✅ |
| Async Server Components | ❌ | — | ✅ |
| RLS policies (database security) | — | ✅ | — |
| Better Auth API (sign up, sign in, etc.) | — | ✅ | — |
| Full user flows | — | — | ✅ |

> **Note on Server Actions:** The `"use server"` directive is a build-time bundler hint — at test runtime, actions are plain async functions. They are testable in Vitest by mocking the two unavoidable Next.js runtime APIs: `next/headers` (`headers()`) and `next/navigation` (`redirect()`). Do not mock `@/lib/auth` in integration tests — let it use the real Testcontainer DB.
>
> Async Server Components (RSC) cannot be rendered in Vitest and should be covered by E2E.

---

## Test Stack

| Tool                                             | Purpose                        |
| ------------------------------------------------ | ------------------------------ |
| [Vitest](https://vitest.dev/)                    | Unit, component & integration  |
| [Testing Library](https://testing-library.com/)  | Component rendering            |
| [happy-dom](https://github.com/nickvr/happy-dom) | DOM environment (unit suite)   |
| [Testcontainers](https://testcontainers.com/)    | Ephemeral PostgreSQL (integration) |
| [Playwright](https://playwright.dev/)            | E2E browser tests              |

---

## Running Tests

### All Tests

```bash
# Unit/component tests (no DB, fast)
pnpm test

# Integration tests (Testcontainer, real DB)
pnpm test:integration

# E2E tests
pnpm test:e2e
```

### Watch Mode (Development)

```bash
pnpm test:watch
pnpm test:integration:watch
pnpm test:e2e:ui
```

---

## Test Data & Users

All tests use a consistent set of test users defined in `src/test-utils/users.ts`:

| User  | Email            | Role  | Cards | Purpose                     |
| ----- | ---------------- | ----- | ----- | --------------------------- |
| Alice | alice@test.local | user  | 15    | Primary test user with data |
| Bob   | bob@test.local   | user  | 10    | Multi-user RLS testing      |
| Carol | carol@test.local | user  | 0     | Empty state testing         |
| Admin | admin@test.local | admin | 0     | Admin role testing          |

**Password for all users:** `Test123!`

### UUIDs

Test user IDs use predictable patterns for easy reference:

- Alice: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
- Bob: `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`
- Carol: `cccccccc-cccc-cccc-cccc-cccccccccccc`
- Admin: `dddddddd-dddd-dddd-dddd-dddddddddddd`

### Importing Test Users

```typescript
// In database tests
import { TEST_USERS, TEST_PASSWORD } from "../src/test-utils/users";

// In Vitest (unit/integration tests) - uses path alias
import { TEST_USERS } from "@/test-utils";

// In E2E tests - uses JSON export (Node.js compatible)
import { TEST_USERS, TEST_PASSWORD } from "../test-users";
```

---

## Vitest Configuration

### Unit / Component Tests

- **Config:** `vitest.config.mts`
- **DOM:** `happy-dom` environment
- **Setup:** `vitest.setup.ts` (imports `@testing-library/jest-dom`)
- **No DB** — mock any I/O at the boundary

### Integration Tests

- **Config:** `vitest.integration.config.mts`
- **No DOM:** `node` environment
- **Sequential execution:** `fileParallelism: false`
- **Setup:** `src/test-utils/integration/global-setup.ts` (Testcontainer) + `src/test-utils/integration/setup.ts`
- **Includes:** `src/**/*.integration.test.{ts,tsx}`

---

## Playwright Configuration

### Projects

| Project         | Purpose                                           |
| --------------- | ------------------------------------------------- |
| `setup`         | Authenticates all test users, saves storage state |
| `chromium`      | Desktop Chrome tests                              |
| `firefox`       | Desktop Firefox tests                             |
| `webkit`        | Desktop Safari tests                              |
| `Mobile Chrome` | Mobile Chrome tests                               |
| `Mobile Safari` | Mobile Safari tests                               |

### Authentication Strategy

E2E tests use **user-based isolation**:

1. **Setup project** runs first, authenticating all 4 test users
2. Storage states are saved to `e2e/.auth/{user}.json`
3. Each test file can specify which user to run as
4. Default user is Alice

```typescript
// Run as a specific user (custom fixture)
test("bob can see his cards", async ({ page, testUser }) => {
  // testUser contains bob's data
  await page.goto("/timeline");
  expect(testUser.name).toBe("Bob Test");
});
```

### Running E2E Tests

```bash
# All browsers
pnpm test:e2e

# Specific browser
pnpm exec playwright test --project=chromium

# With UI mode (debugging)
pnpm exec playwright test --ui

# Headed mode (visible browser)
pnpm exec playwright test --headed
```

---

## Writing Tests

### Unit Tests (Pure Functions)

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from "vitest";
import { formatDate } from "./utils";

describe("formatDate", () => {
  it("formats full date correctly", () => {
    expect(formatDate({ year: 2024, month: 3, day: 15 })).toBe("15/3/2024");
  });

  it("handles BCE dates", () => {
    expect(formatDate({ year: -44, month: 3, day: 15 })).toBe("15/3/44 BCE");
  });
});
```

### Component Tests

```typescript
// src/components/my-component/my-component.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyComponent } from "./my-component";

// Mock Server Actions if needed
vi.mock("@/app/actions", () => ({
  myServerAction: vi.fn(),
}));

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
```

### RLS/Database Tests

```typescript
// src/db/rls.integration.test.ts
import { describe, it, expect } from "vitest";
import { withRLS } from "./rls";
import { db } from "./client";
import * as schema from "./schema";
import { TEST_USERS } from "./test-utils/users";

describe("RLS Policies", () => {
  it("user can only see their own cards", async () => {
    const cards = await withRLS(TEST_USERS.alice.id, async (tx) => {
      return tx.select().from(schema.card);
    });

    expect(cards.every((c) => c.userId === TEST_USERS.alice.id)).toBe(true);
  });
});
```

### E2E Tests

```typescript
// e2e/timeline.spec.ts
import { test, expect } from "./fixtures";

test.describe("Timeline", () => {
  test("shows user's cards", async ({ page, testUser }) => {
    await page.goto("/timeline");
    await expect(page.getByText(testUser.name)).toBeVisible();
  });

  test("redirects unauthenticated users", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    await page.goto("/timeline");
    await expect(page).toHaveURL(/\/auth\/sign-in/);

    await context.close();
  });
});
```

---

## Conventions

### What to Test

✅ **DO test:**

- Pure utility functions and Zod schemas (unit)
- Component rendering for different state shapes (unit, mock `useActionState`)
- Server Actions — validation paths, error mapping, success returns (unit with mocked Next.js runtime; integration with real DB)
- RLS policies and database security (integration)
- Better Auth API flows: sign up, sign in, duplicate email, bad credentials (integration)
- Critical user flows (E2E)

❌ **DON'T test:**

- Third-party library components (shadcn/ui, etc.)
- Async Server Components in Vitest (use E2E)
- Implementation details or internal state
- Styling/visual appearance
- `<Link>` elements, button existence, layout

### File Naming

- Unit/component tests: `{name}.test.ts` or `{name}.test.tsx` (co-located)
- Integration tests: `{name}.integration.test.ts` or `{name}.integration.test.tsx` (co-located)
- E2E tests: `{feature}.spec.ts` inside `e2e/tests/`
- Test utilities: `test-utils/` directories

### Test Organization

```
├── src/
│   ├── test-utils/                          # Shared test utilities
│   │   ├── integration/
│   │   │   ├── global-setup.ts              # Testcontainer setup/teardown
│   │   │   └── setup.ts                     # Per-file setup hooks
│   │   ├── unit/
│   │   │   └── setup.ts                     # jest-dom matchers
│   │   ├── users.ts                         # Test user constants
│   │   ├── users.json                       # Test user data (single source of truth)
│   │   ├── auth.ts                          # Mock session utilities
│   │   └── index.ts                         # Re-exports
│   ├── db/
│   │   ├── rls.ts                           # Source file
│   │   └── rls.integration.test.ts          # Integration test (colocated)
│   ├── lib/
│   │   ├── utils.ts
│   │   └── utils.test.ts
│   └── components/
│       └── sign-out-button/
│           ├── sign-out-button.tsx
│           └── sign-out-button.test.tsx
├── e2e/
│   ├── auth.setup.ts      # Auth setup project
│   ├── fixtures.ts        # Custom test fixtures
│   ├── global-setup.ts    # Starts Testcontainer, runs migrations + seed
│   ├── test-users.ts      # Test user data (re-exports from src/test-utils)
│   └── tests/
│       └── timeline.spec.ts  # E2E test specs
```

---

## Mocking

### Server Actions in Component Tests

When a component receives a Server Action as a prop or imports one, mock it at the module level. The `"use server"` directive is ignored in tests — actions are plain async functions, but their Next.js runtime dependencies (`headers()`, `redirect()`) are not available in the unit suite:

```typescript
vi.mock("@/components/auth/actions", () => ({
  signUpAction: vi.fn(),
}));
```

For testing the **action logic itself** (validation, error mapping, DB calls), see integration tests below.

### Next.js Runtime APIs

Two Next.js APIs always need mocking when testing Server Actions directly:

```typescript
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
```

### `useActionState` in Component Tests

Mock `useActionState` to inject controlled state:

```typescript
vi.mock("react", async (importActual) => ({
  ...(await importActual<typeof import("react")>()),
  useActionState: vi.fn(),
}));

// In each test:
vi.mocked(useActionState).mockReturnValue([
  { fieldErrors: { email: "Please enter a valid email address" } },
  vi.fn(),
  false,
]);
```

### Database in RLS Tests

RLS tests run against the **real database** (no mocking). This is intentional:

- Tests verify actual PostgreSQL RLS policies
- Uses a Testcontainer (ephemeral PostgreSQL, fresh, isolated, seeded)
- Ensures security policies work as expected

See [Testcontainer Test Isolation](#testcontainer-test-isolation) for details.

### Authentication in Component Tests

Use `createMockSession` for components that need auth context:

```typescript
import { createMockSession } from "@/test-utils";
import { TEST_USERS } from "@/test-utils";

const mockSession = createMockSession(TEST_USERS.alice);
```

---

## Integration Test Isolation

Each integration test must leave the database in the same state it found it. Two strategies:

### Transactional rollback (Drizzle queries)

Wrap the test body in a transaction that rolls back in `afterEach`. Zero performance cost, perfect isolation:

```typescript
import { db } from "@/db/client";

let tx: Parameters<Parameters<typeof db.transaction>[0]>[0];

beforeEach(async () => {
  await new Promise<void>((resolve) => {
    db.transaction(async (t) => {
      tx = t;
      resolve();
      // keep transaction open until afterEach rolls it back
      await new Promise(() => {});
    }).catch(() => {});
  });
});

afterEach(async () => {
  await tx.rollback();
});
```

> Use this for tests that run Drizzle queries directly (e.g. RLS tests, card CRUD).

### Explicit cleanup (Better Auth operations)

Better Auth manages its own transactions internally — transactional rollback cannot wrap them. Use `afterEach` to delete rows created by the test:

```typescript
afterEach(async () => {
  await db.delete(user).where(eq(user.email, "newuser@test.local"));
});
```

> Use this for auth integration tests (`signUpAction`, `auth.api.signUpEmail`, etc.).

**Never use per-test Testcontainers** — startup cost (~5–10s each) makes them impractical. The global Testcontainer is seeded once per suite run; tests are responsible for their own cleanup.

---

## Testcontainer Test Isolation

Both RLS tests (Vitest) and E2E tests (Playwright) use **Testcontainers** (ephemeral PostgreSQL containers) for test isolation. This ensures:

- Tests run against a known, seeded database state
- No interference from development data changes
- No network access or external services required
- Tests are predictable and reproducible

### How It Works

**Vitest (database tests):**

1. Global setup starts a PostgreSQL Testcontainer, migrates, seeds
2. `DATABASE_URL` is set to the container's connection string
3. Tests execute against the isolated container
4. Global teardown stops and removes the container

**Playwright (E2E tests):**

1. Global setup starts a PostgreSQL Testcontainer, migrates, seeds
2. Writes `.env.test` with `DATABASE_URL` for the Next.js webServer
3. webServer sources `.env.test` and starts Next.js
4. Tests execute against the isolated container
5. Teardown (returned from globalSetup) stops container and removes `.env.test`

### Prerequisites

- **Docker** must be running locally and in CI (ubuntu-latest has Docker pre-installed)

---

## CI Integration

Tests are integrated into the CI pipeline via the [verify workflow](../.github/workflows/verify.yml):

### What Runs in CI

| Test Type         | Runs In CI | Command                    |
| ----------------- | :--------: | -------------------------- |
| Linting           |     ✅     | `pnpm lint`                |
| Unit/component    |     ✅     | `pnpm test`                |
| Integration       |     ✅     | `pnpm test:integration`    |
| E2E               |     ✅     | `pnpm test:e2e`            |

### CI Workflow

Each test runner starts and stops its own Testcontainer:

```
Vitest (db) → Starts container → Runs tests → Stops container
Playwright  → Starts container → Runs tests → Stops container
```

This ensures complete isolation. Docker is pre-installed on `ubuntu-latest` — no extra setup needed.

### Secrets Required

No secrets are required for the verify workflow. Tests use Testcontainers (local Docker).

See [CI-CD.md](./CI-CD.md) for full setup instructions.

---

## Troubleshooting

### E2E Tests Fail with "Invalid Password"

The seed script must use Better Auth's exact scrypt parameters. If passwords aren't working:

```bash
# Reseed the database
pnpm db:reset:local && pnpm db:seed
```

### Vitest Can't Find Module

Check that path aliases in `vitest.config.ts` match `tsconfig.json`:

```typescript
// vitest.config.mts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
},
```

### Playwright Can't Resolve Workspace Package

Playwright runs in pure Node without TypeScript compilation. For test utilities, create local copies in the `e2e/` folder:

```typescript
// e2e/test-users.ts (local copy)
export const TEST_USERS = {
  /* ... */
};
```

### Tests Hang or Timeout

- **RLS tests:** Ensure database connection is closed in `afterAll`
- **E2E tests:** Increase timeout in `playwright.config.ts`
- **Component tests:** Check for missing async cleanup

### Testcontainer Issues

**Docker not running:**

```bash
# Ensure Docker daemon is running
docker info

# On macOS, start Docker Desktop
open -a Docker
```

**Stale .env.test file:**
If `.env.test` points to a stopped container:

```bash
# Remove stale env file
rm .env.test

# Re-run tests (will create fresh container)
pnpm test:e2e
```
