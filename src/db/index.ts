// ─────────────────────────────────────────────────────────────────────────────
// Database Layer
// ─────────────────────────────────────────────────────────────────────────────
// Database client and schema exports for the history-portal project.
// Uses @neondatabase/serverless driver for all environments (local, CI, cloud).
// ─────────────────────────────────────────────────────────────────────────────

// Database clients
export { db, dbPool } from "./client";
export type { DbClient, DbPoolClient } from "./client";

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
