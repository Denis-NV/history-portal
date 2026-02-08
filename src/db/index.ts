// ─────────────────────────────────────────────────────────────────────────────
// Database Layer
// ─────────────────────────────────────────────────────────────────────────────
// Database client and schema exports for the history-portal project.
// Uses postgres.js driver for all environments (local, CI, cloud).
// ─────────────────────────────────────────────────────────────────────────────

// Database client
export { db } from "./client";
export type { DbClient } from "./client";

// Re-export drizzle-orm utilities (single source to avoid version conflicts)
export {
  sql,
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  and,
  or,
  not,
  inArray,
} from "drizzle-orm";

// Schema exports (add tables here as they're created)
export * from "./schema";

// RLS helpers
export { withRLS, withAdminAccess } from "./rls";
