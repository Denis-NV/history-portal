/**
 * Set up a personal Neon dev branch for local development.
 *
 * This script:
 * 1. Gets Neon project ID from Pulumi staging stack
 * 2. Creates a 'dev-local' branch (or uses existing)
 * 3. Outputs the connection string for .env.local
 *
 * Prerequisites:
 * - Authenticated with Neon: pnpm neonctl auth
 * - Pulumi staging stack deployed
 *
 * Usage: pnpm db:setup:neon-dev
 */

import { execSync } from "node:child_process";
import { userInfo } from "node:os";

const username = userInfo().username;
const DEV_BRANCH_NAME = `dev-${username}`;

const neonctl = (args: string): string => {
  const cmd = `pnpm exec neonctl ${args}`;
  return execSync(cmd, { encoding: "utf-8" }).trim();
};

async function setupDevBranch() {
  console.log("🔧 Setting up Neon dev branch for local development...\n");

  // Get Neon project ID from Pulumi
  console.log("🔍 Getting Neon project ID from Pulumi staging stack...");
  let projectId: string;
  try {
    projectId = execSync(
      "pulumi -C ../../infra stack output neonProjectId --stack staging",
      { encoding: "utf-8" }
    ).trim();
  } catch {
    console.error("❌ Failed to get Neon project ID from Pulumi");
    console.error(
      "   Make sure the staging stack is deployed: pnpm infra:up:staging"
    );
    process.exit(1);
  }
  console.log(`   Project ID: ${projectId}`);

  // Check if branch already exists
  console.log(`\n🔍 Checking if '${DEV_BRANCH_NAME}' branch exists...`);
  let branchExists = false;
  try {
    const branches = neonctl(
      `branches list --project-id ${projectId} --output json`
    );
    const branchList = JSON.parse(branches);
    branchExists = branchList.some(
      (b: { name: string }) => b.name === DEV_BRANCH_NAME
    );
  } catch {
    console.error("❌ Failed to list branches. Are you authenticated?");
    console.error("   Run: pnpm --filter @history-portal/db exec neonctl auth");
    process.exit(1);
  }

  if (branchExists) {
    console.log(`   ✅ Branch '${DEV_BRANCH_NAME}' already exists`);
  } else {
    console.log(`   Creating branch '${DEV_BRANCH_NAME}' from main...`);
    try {
      neonctl(
        `branches create --name ${DEV_BRANCH_NAME} --project-id ${projectId}`
      );
      console.log(`   ✅ Branch '${DEV_BRANCH_NAME}' created`);
    } catch (error) {
      console.error("❌ Failed to create branch:", error);
      process.exit(1);
    }
  }

  // Get connection string
  console.log("\n🔗 Getting connection string...");
  const connectionString = neonctl(
    `connection-string ${DEV_BRANCH_NAME} --project-id ${projectId}`
  );

  // Output instructions
  console.log("\n" + "─".repeat(60));
  console.log("✅ Neon dev branch is ready!\n");
  console.log("Add this to packages/portal/.env.local:\n");
  console.log(`DATABASE_URL="${connectionString}"`);
  console.log("\n" + "─".repeat(60));
  console.log("\nNotes:");
  console.log("• This branch is created from staging's main branch");
  console.log("• Run `pnpm db:reset:local` to reset and run migrations");
  console.log("• To use Docker instead, remove DATABASE_URL from .env.local");
  console.log("• Branch persists until you delete it (won't auto-delete)");
}

setupDevBranch().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});
