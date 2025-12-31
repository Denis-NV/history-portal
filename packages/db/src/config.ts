// ─────────────────────────────────────────────────────────────────────────────
// Database Connection Configuration
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for database connection settings.
// Used by both Drizzle Kit (CLI) and runtime client.
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// Get directory path in ES modules (use unique names to avoid conflicts with bundlers)
const _configFilePath = fileURLToPath(import.meta.url);
const _configDirPath = dirname(_configFilePath);

// Load DATABASE_URL from .env.test if it exists (for ephemeral test branches)
// This happens at module load time, before process.env.DATABASE_URL is read
function loadEnvTest(): string | undefined {
  const envTestPath = resolve(_configDirPath, "../../.env.test");
  if (existsSync(envTestPath)) {
    const content = readFileSync(envTestPath, "utf-8");
    const match = content.match(/DATABASE_URL=(.+)/);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
}

// Local development defaults
export const LOCAL_HOST = "db.localtest.me";
export const LOCAL_PORT = 5432;
export const LOCAL_USER = "postgres";
export const LOCAL_PASSWORD = "postgres";
export const LOCAL_DATABASE = "history_portal";

/**
 * Database connection string.
 * Priority: .env.test (ephemeral test branch) > DATABASE_URL env var > local default
 * - Test: Uses ephemeral Neon branch (for E2E/integration tests)
 * - Cloud: Set via DATABASE_URL environment variable by Cloud Run
 * - Local: Uses localtest.me domain (routed to Docker via neon-proxy)
 */
export const connectionString =
  loadEnvTest() ??
  process.env.DATABASE_URL ??
  `postgres://${LOCAL_USER}:${LOCAL_PASSWORD}@${LOCAL_HOST}:${LOCAL_PORT}/${LOCAL_DATABASE}`;

/**
 * Admin connection string (connects to 'postgres' database for admin operations).
 * Used for creating/dropping databases.
 */
export const adminConnectionString = `postgres://${LOCAL_USER}:${LOCAL_PASSWORD}@${LOCAL_HOST}:${LOCAL_PORT}/postgres`;

/**
 * Detect if running against local Docker PostgreSQL.
 * True when DATABASE_URL is not set (uses default localtest.me).
 */
export const isLocalDocker = connectionString.includes("localtest.me");

/**
 * Detect if running against Neon (cloud or dev branch).
 * True when DATABASE_URL contains neon.tech.
 */
export const isNeon = connectionString.includes("neon.tech");

/**
 * Legacy alias for isLocalDocker.
 * @deprecated Use isLocalDocker or isNeon instead.
 */
export const isLocal = isLocalDocker;
