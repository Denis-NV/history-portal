/**
 * Reset the staging database using Neon CLI.
 *
 * This script:
 * 1. Gets Neon project ID from Pulumi stack outputs
 * 2. Resets the staging branch to a clean state
 * 3. Runs all migrations (Drizzle + RLS)
 * 4. Seeds the database (if seed script exists)
 *
 * Prerequisites:
 * - Authenticated with Neon: pnpm neonctl auth
 * - Pulumi staging stack deployed
 *
 * Usage: pnpm db:reset:staging
 */

import { execSync } from "node:child_process";

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
  console.log(`🗑️  Resetting staging branch...`);

  try {
    // Reset the staging branch (clears all data, keeps schema)
    neonctl(
      `branches reset ${STAGING_BRANCH} --project-id ${projectId}`
    );
    console.log("✅ Staging branch reset");
  } catch (error) {
    // Branch might not exist or other error
    console.error("❌ Failed to reset staging branch");
    console.error(
      "   Make sure the staging branch exists in your Neon project"
    );
    console.error("   You may need to authenticate: pnpm --filter @history-portal/db exec neonctl auth");
    process.exit(1);
  }

  // Get the staging database URL
  console.log("🔗 Getting staging connection string...");
  const connectionString = neonctl(
    `connection-string ${STAGING_BRANCH} --project-id ${projectId}`,
    { encoding: "utf-8" }
  ).trim();

  // Run migrations against staging
  console.log("🔄 Running migrations...");
  execSync("pnpm migrate:all", {
    stdio: "inherit",
    cwd: import.meta.dirname,
    env: { ...process.env, DATABASE_URL: connectionString },
  });

  // Run seed if it exists
  // TODO: Add seed script when ready
  // console.log("🌱 Seeding database...");
  // execSync("pnpm seed", { stdio: "inherit", env: { ...process.env, DATABASE_URL: connectionString } });

  console.log("🎉 Staging database reset complete!");
}

resetStagingDatabase().catch((error) => {
  console.error("❌ Failed to reset staging database:", error);
  process.exit(1);
});
