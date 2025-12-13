// ─────────────────────────────────────────────────────────────────────────────
// Database Connection Configuration
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for database connection settings.
// Used by both Drizzle Kit (CLI) and runtime client.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Database connection string.
 * - Local: Uses localtest.me domain (routed to Docker via neon-proxy)
 * - Cloud: Set via DATABASE_URL environment variable by Cloud Run
 */
export const connectionString =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@db.localtest.me:5432/history_portal";

/**
 * Detect if running against local Docker PostgreSQL.
 * Used to configure the Neon driver for local development.
 */
export const isLocal = connectionString.includes("localtest.me");
