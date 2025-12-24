/**
 * Reset the staging database using Neon CLI.
 *
 * This script:
 * 1. Gets Neon project ID from Pulumi stack outputs
 * 2. Drops and recreates the public schema (clean slate)
 * 3. Runs all migrations (Drizzle + RLS)
 * 4. Seeds the database
 *
 * Prerequisites:
 * - Authenticated with Neon: pnpm neonctl auth
 * - Pulumi staging stack deployed
 *
 * Usage: pnpm reset:staging
 */

import { execSync } from "node:child_process";
import postgres from "postgres";

const STAGING_BRANCH = "main"; // Neon's default branch

// Use local neonctl via pnpm exec
const neonctl = (args: string, options?: { encoding: "utf-8" }): string => {
  const cmd = `pnpm exec neonctl ${args}`;
  const result = execSync(cmd, options);
  return typeof result === "string" ? result : result.toString();
};

async function resetStagingDatabase() {
  // Get Neon project ID from Pulumi stack outputs
  console.log("🔍 Getting Neon project ID from Pulumi...");
  let projectId: string;
  try {
    projectId = execSync(
      "pulumi -C ../../infra stack output neonProjectId --stack staging",
      {
        encoding: "utf-8",
      }
    ).trim();
  } catch {
    console.error("❌ Failed to get Neon project ID from Pulumi");
    console.error(
      "   Make sure the staging stack is deployed: pnpm infra:up:staging"
    );
    process.exit(1);
  }

  console.log(`   Project ID: ${projectId}`);

  // Get the staging database URL
  console.log("🔗 Getting staging connection string...");
  const connectionString = neonctl(
    `connection-string ${STAGING_BRANCH} --project-id ${projectId} --role-name neondb_owner`,
    { encoding: "utf-8" }
  ).trim();

  // Drop and recreate schemas for a clean slate
  console.log("🗑️  Dropping all schemas...");
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

  // Run migrations against staging
  console.log("🔄 Running migrations...");
  execSync("pnpm migrate:all", {
    stdio: "inherit",
    cwd: import.meta.dirname,
    env: { ...process.env, DATABASE_URL: connectionString },
  });

  // Note: Seeding is handled by the CI/CD pipeline
  // To seed manually: DATABASE_URL=<staging-url> pnpm seed

  console.log("🎉 Staging database reset complete!");
}

resetStagingDatabase().catch((error) => {
  console.error("❌ Failed to reset staging database:", error);
  process.exit(1);
});
