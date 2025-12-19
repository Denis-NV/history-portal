// ─────────────────────────────────────────────────────────────────────────────
// Database Connection Configuration
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for database connection settings.
// Used by both Drizzle Kit (CLI) and runtime client.
// ─────────────────────────────────────────────────────────────────────────────

// Local development defaults
export const LOCAL_HOST = "db.localtest.me";
export const LOCAL_PORT = 5432;
export const LOCAL_USER = "postgres";
export const LOCAL_PASSWORD = "postgres";
export const LOCAL_DATABASE = "history_portal";

/**
 * Database connection string.
 * - Local: Uses localtest.me domain (routed to Docker via neon-proxy)
 * - Cloud: Set via DATABASE_URL environment variable by Cloud Run
 */
export const connectionString =
  process.env.DATABASE_URL ??
  `postgres://${LOCAL_USER}:${LOCAL_PASSWORD}@${LOCAL_HOST}:${LOCAL_PORT}/${LOCAL_DATABASE}`;

/**
 * Admin connection string (connects to 'postgres' database for admin operations).
 * Used for creating/dropping databases.
 */
export const adminConnectionString = `postgres://${LOCAL_USER}:${LOCAL_PASSWORD}@${LOCAL_HOST}:${LOCAL_PORT}/postgres`;

/**
 * Detect if running against local Docker PostgreSQL.
 * Used to configure the Neon driver for local development.
 */
export const isLocal = connectionString.includes("localtest.me");
