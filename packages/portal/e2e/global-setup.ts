/**
 * Playwright Global Setup
 *
 * Creates an ephemeral Neon branch before all E2E tests run.
 * This ensures tests run against a fresh, isolated database.
 *
 * The branch is:
 * - Created from main (staging) branch
 * - Migrated with latest schema + RLS policies
 * - Seeded with test data
 * - Deleted after tests complete (via globalTeardown)
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Use process.cwd() since Playwright runs from portal package root
const dbPackagePath = resolve(process.cwd(), "../db");
const envTestFile = resolve(dbPackagePath, ".env.test");

async function globalSetup() {
  console.log("\n🧪 E2E Global Setup: Creating ephemeral Neon branch...\n");

  // Clean up any stale .env.test from previous interrupted runs
  if (existsSync(envTestFile)) {
    console.log("   ⚠️  Found stale .env.test, cleaning up first...");
    try {
      execSync("tsx scripts/ephemeral-branch.ts delete", {
        cwd: dbPackagePath,
        stdio: "inherit",
      });
    } catch {
      // Ignore cleanup errors
    }
  }

  try {
    execSync("tsx scripts/ephemeral-branch.ts create", {
      cwd: dbPackagePath,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("❌ Failed to create ephemeral branch:", error);
    throw error;
  }

  console.log("\n✅ Ephemeral branch ready for E2E tests\n");
}

export default globalSetup;
