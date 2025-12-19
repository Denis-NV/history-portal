/**
 * Reset the local database.
 *
 * This script drops and recreates the database, then runs all migrations.
 * USE ONLY FOR LOCAL DEVELOPMENT - never run against production!
 *
 * Usage: pnpm db:reset
 */

import postgres from "postgres";
import { execSync } from "node:child_process";

import { adminConnectionString, isLocal, LOCAL_DATABASE } from "../src/config";

async function resetDatabase() {
  // Safety check - only allow reset on local database
  if (!isLocal) {
    console.error("❌ db:reset can only be run against local database!");
    console.error(
      "   For Neon staging/prod, use: neonctl branches reset <branch-name>"
    );
    process.exit(1);
  }

  console.log("🗑️  Dropping database...");

  const sql = postgres(adminConnectionString);

  try {
    // Terminate existing connections
    await sql.unsafe(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${LOCAL_DATABASE}'
        AND pid <> pg_backend_pid()
    `);

    // Drop and recreate
    await sql.unsafe(`DROP DATABASE IF EXISTS ${LOCAL_DATABASE}`);
    await sql.unsafe(`CREATE DATABASE ${LOCAL_DATABASE}`);

    console.log("✅ Database recreated");
  } finally {
    await sql.end();
  }

  // Run migrations
  console.log("🔄 Running migrations...");
  execSync("pnpm migrate:all", { stdio: "inherit", cwd: import.meta.dirname });

  console.log("🎉 Database reset complete!");
}

resetDatabase().catch((error) => {
  console.error("❌ Failed to reset database:", error);
  process.exit(1);
});
