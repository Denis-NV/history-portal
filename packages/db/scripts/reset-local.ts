/**
 * Reset the local development database (Neon dev branch).
 *
 * Clears all schemas and re-runs migrations for a clean slate.
 *
 * Usage: pnpm reset:local
 */

import postgres from "postgres";
import { execSync } from "node:child_process";
import { userInfo } from "node:os";

import { connectionString } from "../src/config";

const username = userInfo().username;
const DEV_BRANCH_NAME = `dev-${username}`;

async function resetDatabase() {
  console.log("🌐 Resetting Neon dev branch...");
  console.log(`   Branch: ${DEV_BRANCH_NAME}`);

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
  execSync("pnpm migrate:all", {
    stdio: "inherit",
    cwd: import.meta.dirname,
    env: { ...process.env, DATABASE_URL: connectionString },
  });

  console.log("🎉 Database reset complete!");
}

resetDatabase().catch((error) => {
  console.error("❌ Failed to reset database:", error);
  process.exit(1);
});
