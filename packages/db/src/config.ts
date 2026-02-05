// ─────────────────────────────────────────────────────────────────────────────
// Database Connection Configuration
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for database connection settings.
// Used by both Drizzle Kit (CLI) and runtime client.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the database connection string, throwing if not set.
 * Used by client.ts (lazy — only called on first query, not at import time).
 */
export function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Set it in packages/db/.env.local or as an environment variable."
    );
  }
  return url;
}

/**
 * Static connection string for CLI tools (drizzle.config.ts).
 * These always run with dotenv so DATABASE_URL is guaranteed to be set.
 */
export const connectionString = process.env.DATABASE_URL ?? "";
