/**
 * Apply RLS policies to the database.
 *
 * This script runs the idempotent RLS SQL migration.
 * Safe to run multiple times - uses CREATE OR REPLACE.
 *
 * Usage: pnpm migrate:rls
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

import { connectionString } from "../src/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrateRLS() {
  const sql = postgres(connectionString);

  try {
    console.log("🔐 Applying RLS policies...");

    const migrationPath = join(__dirname, "../migrations/rls-policies.sql");
    const migrationSql = readFileSync(migrationPath, "utf-8");

    await sql.unsafe(migrationSql);

    console.log("✅ RLS policies applied successfully");
  } catch (error) {
    console.error("❌ Failed to apply RLS policies:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrateRLS();
