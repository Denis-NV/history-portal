/**
 * Apply RLS policies to the database.
 *
 * This script runs the idempotent RLS SQL migration.
 * Safe to run multiple times - uses CREATE OR REPLACE.
 *
 * Usage: pnpm migrate:rls
 */

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local from portal package BEFORE importing config
config({ path: resolve(__dirname, "../../portal/.env.local") });
config({ path: resolve(__dirname, "../../portal/.env") });

// Dynamic import to ensure env is loaded first
const { connectionString } = await import("../src/config");
const postgres = (await import("postgres")).default;

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
