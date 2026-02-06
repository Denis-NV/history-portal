# Code Conventions

> **Purpose:** Coding conventions and patterns to maintain consistency across the codebase. Use this document as context for AI assistants and developer reference.

**Last Updated:** December 20, 2025

---

## Table of Contents

1. [React Components](#1-react-components)
2. [File & Folder Structure](#2-file--folder-structure)
3. [Naming Conventions](#3-naming-conventions)
4. [API Type Safety](#4-api-type-safety)
5. [Database Seeding](#5-database-seeding)

---

## 1. React Components

### Function Style

Always use **arrow functions** for React components:

```tsx
// ✅ Correct
export const MyComponent = () => {
  return <div>Content</div>;
};

// ❌ Incorrect
export function MyComponent() {
  return <div>Content</div>;
}
```

### Server vs Client Components

- **Default to Server Components** — Components are server-rendered unless there's a specific need for client-side interactivity
- **Use Client Components only when required:**
  - Event handlers (`onClick`, `onChange`, etc.)
  - React hooks (`useState`, `useEffect`, `useActionState`, etc.)
  - Browser APIs (`window`, `localStorage`, etc.)
  - Third-party client-only libraries

```tsx
// Server Component (default) - no directive needed
export const StaticContent = () => {
  return <div>Server rendered content</div>;
};

// Client Component - add directive at top of file
("use client");

export const InteractiveButton = () => {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
```

### TypeScript Types

Always use **`type`** over `interface` for consistency:

```tsx
// ✅ Correct
type Props = {
  title: string;
  isActive?: boolean;
};

type ApiResponse = {
  data: User[];
  total: number;
};

// ❌ Incorrect
interface Props {
  title: string;
  isActive?: boolean;
}
```

### Props Type

Define props using a `Props` type directly above the component:

```tsx
type Props = {
  title: string;
  isActive?: boolean;
};

export const Card = ({ title, isActive = false }: Props) => {
  return <div className={isActive ? "active" : ""}>{title}</div>;
};
```

---

## 2. File & Folder Structure

### Component Organization

| Component Type                  | Location                                  | Example                         |
| ------------------------------- | ----------------------------------------- | ------------------------------- |
| **Common/shared components**    | `src/components/common/<component-name>/` | `src/components/common/header/` |
| **Feature-specific components** | `src/components/<feature>/`               | `src/components/auth/`          |
| **Page-specific components**    | `src/app/<route>/_components/`            | `src/app/timeline/_components/` |

### Folder Structure for Components

Each component lives in its own folder to accommodate future test files and related assets:

```
src/components/common/
├── header/
│   ├── header.tsx           # Main component
│   ├── header.test.tsx      # Tests (future)
│   └── index.ts             # Re-export
└── sign-out-button/
    ├── sign-out-button.tsx
    ├── sign-out-button.test.tsx
    └── index.ts
```

### Index Files

Use `index.ts` files **only inside individual component folders** (not at the `common/` level):

```tsx
// src/components/common/header/index.ts
export { Header } from "./header";
```

Import components from their folder:

```tsx
import { Header } from "@/components/common/header";
import { SignOutButton } from "@/components/common/sign-out-button";
```

---

## 3. Naming Conventions

### Files and Folders

| Element             | Convention                   | Example                             |
| ------------------- | ---------------------------- | ----------------------------------- |
| **Folders**         | lowercase with hyphens       | `sign-out-button/`, `user-profile/` |
| **Component files** | lowercase with hyphens       | `sign-out-button.tsx`, `header.tsx` |
| **Test files**      | component name + `.test.tsx` | `header.test.tsx`                   |
| **Index files**     | always `index.ts`            | `index.ts`                          |

### Code

| Element                 | Convention                    | Example                                  |
| ----------------------- | ----------------------------- | ---------------------------------------- |
| **Component functions** | PascalCase                    | `Header`, `SignOutButton`, `UserProfile` |
| **Props types**         | `Props` or `<Component>Props` | `Props`, `HeaderProps`                   |
| **Hooks**               | camelCase with `use` prefix   | `useSession`, `useAuth`                  |
| **Utilities**           | camelCase                     | `formatDate`, `parseToken`               |
| **Constants**           | SCREAMING_SNAKE_CASE          | `API_URL`, `MAX_RETRIES`                 |

### Examples

```
# Folder and file naming
src/components/common/user-avatar/user-avatar.tsx

# Component naming inside the file
export const UserAvatar = ({ src, alt }: Props) => { ... };
```

---

## 4. API Type Safety

### Overview

We use a **hybrid approach** for type-safe API requests and responses:

1. **Drizzle `.$inferSelect`** for database entity types (single source of truth)
2. **Co-located `types.ts`** files for request/response contracts
3. **`satisfies`** keyword in route handlers for compile-time validation

### Schema Types

Export inferred types from each schema file using `.$inferSelect`:

```typescript
// src/db/schema/cards.ts
export const layer = pgTable("layer", { ... });

// ✅ Correct - use .$inferSelect
export type Layer = typeof layer.$inferSelect;
export type NewLayer = typeof layer.$inferInsert;

// ❌ Incorrect - requires extra import
import { InferSelectModel } from "drizzle-orm";
export type Layer = InferSelectModel<typeof layer>;
```

### Co-located Route Types

Each API route folder contains a `types.ts` file with request/response types:

```
src/app/api/
├── layers/
│   ├── route.ts      # Route handler
│   └── types.ts      # LayersResponse
├── cards/
│   ├── route.ts
│   └── types.ts      # CardsRequest, CardsResponse, CardWithLayer
```

#### Example: types.ts

```typescript
// src/app/api/cards/types.ts
import type { Card, Layer, LayerRole } from "@/db";

// Request type for POST body
export type CardsRequest = {
  layerIds?: string[];
};

// Composed response type using Pick for partial entities
export type CardWithLayer = Pick<
  Card,
  "id" | "title" | "summary" | "startYear" | "createdAt"
> & {
  layerId: Layer["id"];
  layerTitle: Layer["title"];
  role: LayerRole;
};

export type CardsResponse = {
  cards: CardWithLayer[];
};
```

### Route Handlers

Use `satisfies` to validate response shape at compile time:

```typescript
// src/app/api/layers/route.ts
import type { LayersResponse } from "./types";

export async function GET() {
  const layers = await withRLS(userId, (tx) => tx.select().from(layer));

  // ✅ Compile error if shape doesn't match LayersResponse
  return NextResponse.json({ layers } satisfies LayersResponse);
}
```

### Client Components

Import types from API route files for typed fetch responses:

```typescript
// Component fetching data
import type { Layer } from "@/db";
import type { LayersResponse } from "@/app/api/layers/types";
import type { CardsRequest, CardsResponse } from "@/app/api/cards/types";

// Typed response
const response = await fetch("/api/layers");
const data: LayersResponse = await response.json();

// Typed request body
const requestBody: CardsRequest = { layerIds: ["id1", "id2"] };
const response = await fetch("/api/cards", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(requestBody),
});
const data: CardsResponse = await response.json();
```

### Benefits

| Benefit                     | How                                   |
| --------------------------- | ------------------------------------- |
| **Single source of truth**  | Types derived from Drizzle schema     |
| **Compile-time validation** | `satisfies` catches shape mismatches  |
| **Discoverability**         | Types co-located with routes          |
| **Refactoring safety**      | Schema changes surface as type errors |

### Dynamic Route Export

API routes that import from `@/db` (directly or transitively) must include `export const dynamic = "force-dynamic"`:

```typescript
// src/app/api/health/db/route.ts
import { db, sql } from "@/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = async () => {
  // ...
};
```

**Why:** During `next build` inside Docker, `DATABASE_URL` is not available (it's a runtime secret injected by Cloud Run). While the db clients are lazy-initialized via Proxy, routes without `dynamic` would still be pre-rendered — executing the handler and triggering a database connection attempt at build time.

Routes that use `headers()` or `cookies()` (e.g., via `getSession()`) are auto-detected as dynamic by Next.js, but an explicit export makes the intent clear.

---

## 5. Database Seeding

### Overview

We use **Drizzle ORM** directly for database seeding via a custom script at `scripts/db/seed.ts`. Run with:

```bash
pnpm db:seed
```

### Two Approaches: Exact vs Random Data

| Approach        | Use Case                           | Tool                                          |
| --------------- | ---------------------------------- | --------------------------------------------- |
| **Exact data**  | Known test users, specific records | Standard Drizzle inserts with JSON files      |
| **Random data** | Bulk test data, entities           | `drizzle-seed` package with `seed()` function |

**Current implementation:** We use a **hybrid approach**:

- **JSON files** for exact user/account data (predictable test accounts)
- **drizzle-seed** for random layers and cards (bulk content)
- **Manual inserts** for junction tables (avoid duplicate key issues)

### Seed Data Files

Seed data lives in `seed/` as JSON files:

```
seed/
├── users.json      # User records
└── accounts.json   # Account records (linked to users)
```

#### Example: users.json

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Test User",
    "email": "test@example.com",
    "emailVerified": true,
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Why JSON Files?

1. **Maintainable** — Edit data without touching TypeScript code
2. **Reviewable** — Easy to see exactly what gets seeded in PRs
3. **Portable** — Same data format can be used for imports/exports
4. **Type-safe** — TypeScript still validates the structure at runtime

### Idempotency

The seed script uses `onConflictDoNothing()` to make seeding idempotent:

```typescript
await db.insert(user).values(users).onConflictDoNothing();
```

This means:

- **Safe to run multiple times** — won't error on existing data
- **Won't update existing records** — use migrations for that
- **CI/CD friendly** — runs after every migration in staging

### When to Use Random Data

For bulk entities like cards and layers, use `drizzle-seed`:

```typescript
import { seed, reset } from "drizzle-seed";

// Reset tables before regenerating
await reset(db, { layer: schema.layer, card: schema.card });

await seed(db, { layer: schema.layer, card: schema.card }).refine((f) => ({
  layer: {
    count: 3,
    columns: {
      title: f.valuesFromArray({
        values: ["Ancient Civilizations", "Medieval History", "World Wars"],
      }),
    },
  },
  card: {
    count: 20,
    columns: {
      title: f.loremIpsum({ sentencesCount: 1 }),
      startYear: f.int({ minValue: -3000, maxValue: 2020 }),
    },
  },
}));
```

### Junction Tables

For junction tables with composite primary keys (e.g., `cardLayer`, `userLayer`), **avoid drizzle-seed** as it can generate duplicates. Instead, generate them manually after the parent tables are seeded:

```typescript
const allCards = await db.select({ id: schema.card.id }).from(schema.card);
const allLayers = await db.select({ id: schema.layer.id }).from(schema.layer);

// Assign each card to one layer (round-robin)
const cardLayerValues = allCards.map((card, index) => ({
  cardId: card.id,
  layerId: allLayers[index % allLayers.length].id,
}));

await db.insert(schema.cardLayer).values(cardLayerValues).onConflictDoNothing();
```

---

## Quick Reference

```tsx
// src/components/common/example-component/example-component.tsx

// 1. "use client" only if needed (omit for server components)

// 2. Imports
import { SomeDependency } from "@/lib/something";

// 3. Props type
type Props = {
  title: string;
  children?: React.ReactNode;
};

// 4. Arrow function component with PascalCase name
export const ExampleComponent = ({ title, children }: Props) => {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  );
};
```

```tsx
// src/components/common/example-component/index.ts
export { ExampleComponent } from "./example-component";
```

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Overall project architecture
- [AUTHENTICATION.md](./AUTHENTICATION.md) — Authentication implementation details
