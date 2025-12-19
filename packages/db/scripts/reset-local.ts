/**
 * Reset the local development database.
 *
 * This script detects whether you're using:
 * - Neon dev branch (DATABASE_URL set to neon.tech) → resets via Neon API
 * - Docker PostgreSQL (DATABASE_URL not set) → drops/recreates locally
 *
 * After reset, runs all migrations (Drizzle + RLS).
 *
 * Usage: pnpm db:reset:local
 */

import postgres from "postgres";
import { execSync } from "node:child_process";
import { userInfo } from "node:os";

import {
  adminConnectionString,
  connectionString,
  isLocalDocker,
  isNeon,
  LOCAL_DATABASE,
} from "../src/config";

const username = userInfo().username;
const DEV_BRANCH_NAME = `dev-${username}`;

const neonctl = (args: string): string => {
  const cmd = `pnpm exec neonctl ${args}`;
  return execSync(cmd, { encoding: "utf-8" }).trim();
};

async function resetNeonBranch() {
  console.log("🌐 Detected Neon database connection");
  console.log(`🗑️  Resetting Neon branch '${DEV_BRANCH_NAME}'...`);

  // Get project ID from Pulumi
  let projectId: string;
  try {
    projectId = execSync(
      "pulumi -C ../../infra stack output neonProjectId --stack staging",
      { encoding: "utf-8" }
    ).trim();
  } catch {
    console.error("❌ Failed to get Neon project ID from Pulumi");
    console.error("   Make sure the staging stack is deployed");
    process.exit(1);
  }

  try {
    neonctl(`branches reset ${DEV_BRANCH_NAME} --project-id ${projectId}`);
    console.log("✅ Neon branch reset");
  } catch {
    console.error(`❌ Failed to reset branch '${DEV_BRANCH_NAME}'`);
    console.error(
      "   Make sure the branch exists. Run: pnpm db:setup:neon-dev"
    );
    process.exit(1);
  }
}

async function resetDockerDatabase() {
  console.log("🐳 Detected Docker PostgreSQL connection");
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
}

async function resetDatabase() {
  // Determine which mode we're in
  if (isNeon) {
    await resetNeonBranch();
  } else if (isLocalDocker) {
    await resetDockerDatabase();
  } else {
    console.error("❌ Unknown database configuration");
    console.error("   DATABASE_URL should be either:");
    console.error("   - A Neon connection string (contains neon.tech)");
    console.error("   - Not set (uses local Docker PostgreSQL)");
    process.exit(1);
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
