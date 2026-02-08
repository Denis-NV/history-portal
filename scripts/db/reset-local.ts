/**
 * Reset the local development database.
 *
 * Clears all schemas and re-runs migrations for a clean slate.
 *
 * Usage: pnpm db:reset:local
 */

import postgres from "postgres";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { connectionString } from "../../src/db/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function resetDatabase() {
  console.log("🔄 Resetting local database...");

  // Drop and recreate schemas for a clean slate
  // This ensures we rely on migrations, not copied data from main
  console.log("🧹 Dropping all tables...");
  const sql = postgres(connectionString);
  try {
    // Drop drizzle schema (migration journal) so migrations re-run
    await sql.unsafe(`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    // Drop public schema (all tables)
    await sql.unsafe(`DROP SCHEMA public CASCADE`);
    await sql.unsafe(`CREATE SCHEMA public`);
    await sql.unsafe(`GRANT ALL ON SCHEMA public TO PUBLIC`);
    console.log("✅ Schema cleared");
  } finally {
    await sql.end();
  }

  // Run migrations
  console.log("🔄 Running migrations...");
  execSync("pnpm db:migrate:all", {
    stdio: "inherit",
    cwd: resolve(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: connectionString },
  });

  console.log("🎉 Database reset complete!");
}

resetDatabase().catch((error) => {
  console.error("❌ Failed to reset database:", error);
  process.exit(1);
});
