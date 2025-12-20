# Code Conventions

> **Purpose:** Coding conventions and patterns to maintain consistency across the codebase. Use this document as context for AI assistants and developer reference.

**Last Updated:** December 20, 2025

---

## Table of Contents

1. [React Components](#1-react-components)
2. [File & Folder Structure](#2-file--folder-structure)
3. [Naming Conventions](#3-naming-conventions)

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
"use client";

export const InteractiveButton = () => {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
```

### Props Interface

Define props using a `Props` type or interface directly above the component:

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

| Component Type | Location | Example |
| -------------- | -------- | ------- |
| **Common/shared components** | `src/components/common/<component-name>/` | `src/components/common/header/` |
| **Feature-specific components** | `src/components/<feature>/` | `src/components/auth/` |
| **Page-specific components** | `src/app/<route>/_components/` | `src/app/timeline/_components/` |

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

| Element | Convention | Example |
| ------- | ---------- | ------- |
| **Folders** | lowercase with hyphens | `sign-out-button/`, `user-profile/` |
| **Component files** | lowercase with hyphens | `sign-out-button.tsx`, `header.tsx` |
| **Test files** | component name + `.test.tsx` | `header.test.tsx` |
| **Index files** | always `index.ts` | `index.ts` |

### Code

| Element | Convention | Example |
| ------- | ---------- | ------- |
| **Component functions** | PascalCase | `Header`, `SignOutButton`, `UserProfile` |
| **Props types** | `Props` or `<Component>Props` | `Props`, `HeaderProps` |
| **Hooks** | camelCase with `use` prefix | `useSession`, `useAuth` |
| **Utilities** | camelCase | `formatDate`, `parseToken` |
| **Constants** | SCREAMING_SNAKE_CASE | `API_URL`, `MAX_RETRIES` |

### Examples

```
# Folder and file naming
src/components/common/user-avatar/user-avatar.tsx

# Component naming inside the file
export const UserAvatar = ({ src, alt }: Props) => { ... };
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
