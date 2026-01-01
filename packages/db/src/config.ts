// ─────────────────────────────────────────────────────────────────────────────
// Database Connection Configuration
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for database connection settings.
// Used by both Drizzle Kit (CLI) and runtime client.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Database connection string (Neon).
 * Must be set via DATABASE_URL environment variable.
 *
 * - Local: Set in packages/db/.env.local (Neon dev branch)
 * - CI: Set by test runner (ephemeral Neon branch)
 * - Cloud: Set via environment variable
 */
export const connectionString = (() => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Set it in packages/db/.env.local or as an environment variable."
    );
  }
  return url;
})();
