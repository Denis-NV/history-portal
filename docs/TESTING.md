# Testing Guide

This document outlines the testing strategy, conventions, and setup for the History Portal project.

## Testing Strategy Summary

| Component Type                     | Vitest (Unit/Integration) | Playwright (E2E) |
| ---------------------------------- | :-----------------------: | :--------------: |
| Pure functions (utils, formatters) |            ✅             |        —         |
| Validation schemas (Zod)           |            ✅             |        —         |
| Synchronous Client Components      |            ✅             |        —         |
| Async Server Components            |            ❌             |        ✅        |
| Server Actions (`"use server"`)    |            ❌             |        ✅        |
| RLS policies (database security)   |            ✅             |        —         |
| Full user flows                    |             —             |        ✅        |
| Authentication flows               |             —             |        ✅        |

> **Note:** Next.js 16 async Server Components and Server Actions with the `"use server"` directive should be tested via E2E tests, not unit tests. This is [the official Next.js recommendation](https://nextjs.org/docs/app/building-your-application/testing/vitest#async-server-components).

---

## Test Stack

| Tool                                             | Purpose                  | Package(s)     |
| ------------------------------------------------ | ------------------------ | -------------- |
| [Vitest](https://vitest.dev/)                    | Unit & integration tests | `db`, `portal` |
| [Testing Library](https://testing-library.com/)  | Component testing        | `portal`       |
| [happy-dom](https://github.com/nickvr/happy-dom) | DOM environment          | `portal`       |
| [Playwright](https://playwright.dev/)            | E2E browser tests        | `portal`       |

---

## Running Tests

### All Tests

```bash
# Run all unit/integration tests across packages
pnpm test

# Run all E2E tests
pnpm test:e2e
```

### Package-Specific Tests

```bash
# Database package tests (RLS policies, etc.)
pnpm -F @history-portal/db test

# Portal package tests (components, utils)
pnpm -F @history-portal/portal test

# E2E tests with UI
pnpm -F @history-portal/portal test:e2e:ui
```

### Watch Mode (Development)

```bash
# Watch mode for database tests
pnpm -F @history-portal/db test:watch

# Watch mode for portal tests
pnpm -F @history-portal/portal test:watch
```

---

## Test Data & Users

All tests use a consistent set of test users defined in `packages/db/src/test-utils/users.ts`:

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
// In database package tests
import { TEST_USERS, TEST_PASSWORD } from "../src/test-utils/users";

// In Vitest (portal package) - uses package export
import { TEST_USERS } from "@history-portal/db/test-utils";

// In E2E tests - uses JSON export (Node.js compatible)
import { TEST_USERS, TEST_PASSWORD } from "../test-users";
```

---

## Vitest Configuration

### Database Package (`packages/db`)

- **Config:** `packages/db/vitest.config.ts`
- **Sequential execution:** `fileParallelism: false` ensures RLS tests run sequentially
- **No DOM:** Tests run in Node environment
- **Setup:** `packages/db/src/test-utils/setup.ts`

### Portal Package (`packages/portal`)

- **Config:** `packages/portal/vitest.config.mts` (`.mts` for ESM)
- **DOM:** Uses `happy-dom` environment
- **Setup:** `packages/portal/vitest.setup.ts` (imports `@testing-library/jest-dom`)
- **Path aliases:** Configured to match `tsconfig.json`

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
// packages/portal/src/lib/utils.test.ts
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
// packages/portal/src/components/my-component/my-component.test.tsx
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
// packages/db/src/rls.test.ts
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
// packages/portal/e2e/timeline.spec.ts
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

- Pure utility functions
- Validation schemas (Zod)
- Custom React hooks (non-Server Components)
- RLS policies and database security
- Critical user flows via E2E

❌ **DON'T test:**

- Third-party library components (shadcn/ui, etc.)
- Implementation details (internal state)
- Styling/visual appearance (unless critical)
- Server Actions via unit tests (use E2E instead)

### File Naming

- Unit tests: `{name}.test.ts` or `{name}.test.tsx`
- E2E tests: `{feature}.spec.ts`
- Test utilities: `test-utils/` directories

### Test Organization

```
packages/db/
├── src/
│   ├── rls.ts           # Source file
│   ├── rls.test.ts      # Test file (colocated)
│   └── test-utils/      # Test utilities
│       ├── users.ts
│       ├── auth.ts
│       └── index.ts

packages/portal/
├── src/
│   ├── lib/
│   │   ├── utils.ts
│   │   └── utils.test.ts
│   └── components/
│       └── sign-out-button/
│           ├── sign-out-button.tsx
│           └── sign-out-button.test.tsx
└── e2e/
    ├── auth.setup.ts      # Auth setup project
    ├── fixtures.ts        # Custom test fixtures
    ├── global-setup.ts    # Loads DATABASE_URL from .env.test
    ├── global-teardown.ts # Deletes ephemeral branch
    ├── test-users.ts      # Test user data
    └── tests/
        └── timeline.spec.ts  # E2E test specs
```

---

## Mocking

### Server Actions in Component Tests

Server Actions cannot be imported in Vitest (they require the Next.js runtime). Mock them at the module level:

```typescript
vi.mock("@/app/actions", () => ({
  signOutAction: vi.fn(),
}));
```

### Database in RLS Tests

RLS tests run against the **real database** (no mocking). This is intentional:

- Tests verify actual PostgreSQL RLS policies
- Uses an ephemeral Neon branch (fresh, isolated, seeded)
- Ensures security policies work as expected

See [Ephemeral Test Branches](#ephemeral-test-branches) for details.

### Authentication in Component Tests

Use `createMockSession` for components that need auth context:

```typescript
import { createMockSession } from "@history-portal/db/test-utils";
import { TEST_USERS } from "@history-portal/db/test-utils";

const mockSession = createMockSession(TEST_USERS.alice);
```

---

## Ephemeral Test Branches

Both RLS tests (Vitest) and E2E tests (Playwright) use **ephemeral Neon branches** for test isolation. This ensures:

- Tests run against a known, seeded database state
- No interference from development data changes
- Parallel test runs in CI don't conflict
- Tests are predictable and reproducible

### How It Works

**Vitest (unit/integration tests):**

1. Global setup creates ephemeral branch, migrates, seeds
2. Tests execute against the isolated branch
3. Global teardown deletes the branch

**Playwright (E2E tests):**

1. webServer command creates ephemeral branch before starting Next.js
2. Global setup loads DATABASE_URL for the Playwright process
3. Tests execute against the isolated branch
4. Global teardown deletes the branch

Each test runner manages its own branch independently.

### Keeping Branches for Debugging

To preserve the ephemeral branch after tests (for debugging):

```bash
# Set KEEP_TEST_BRANCH to skip cleanup
KEEP_TEST_BRANCH=1 pnpm test:e2e

# When done debugging, delete the .env.test file
# The orphaned Neon branch will auto-suspend
rm packages/db/.env.test
```

### Local Docker Mode

When `DATABASE_URL` is not set, tests run against local Docker (no ephemeral branch needed). This is faster for rapid local iteration:

```bash
# Ensure local Docker is running
pnpm db:up

# Run tests against local Docker
unset DATABASE_URL && pnpm test
```

---

## CI Integration

Tests are integrated into the CI pipeline via the [verify workflow](../.github/workflows/verify.yml):

### What Runs in CI

| Test Type         | Runs In CI | Notes                               |
| ----------------- | :--------: | ----------------------------------- |
| Linting           |     ✅     | `pnpm turbo lint`                   |
| Unit tests        |     ✅     | Against ephemeral Neon branch       |
| Integration tests |     ✅     | RLS tests against ephemeral branch  |
| E2E tests         |     ✅     | Playwright against ephemeral branch |

### CI Workflow

Each test runner creates and deletes its own ephemeral branch:

```
Vitest    → Creates branch → Runs tests → Deletes branch
Playwright → Creates branch → Runs tests → Deletes branch
```

This ensures complete isolation - unit/integration tests and E2E tests never share data.

### Secrets Required

| Secret                | Purpose                         |
| --------------------- | ------------------------------- |
| `PULUMI_ACCESS_TOKEN` | Get Neon project ID from Pulumi |
| `NEON_API_KEY`        | Authenticate with Neon CLI      |

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

### Ephemeral Branch Issues

**Branch creation fails:**

```bash
# Ensure you're authenticated with Neon
pnpm -F @history-portal/db exec neonctl auth

# Check Pulumi staging stack is deployed (for project ID)
pnpm infra:up:staging
```

**Orphaned test branches:**
If tests are interrupted, branches may not be cleaned up:

```bash
# List all branches to find orphaned test-* branches
pnpm -F @history-portal/db exec neonctl branches list

# Delete manually via Neon console or CLI
```

**Stale .env.test file:**
If `.env.test` points to a deleted branch:

```bash
# Remove stale env file
rm packages/db/.env.test

# Re-run tests (will create fresh branch)
pnpm test
```
