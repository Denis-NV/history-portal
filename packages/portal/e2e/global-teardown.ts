/**
 * Playwright Global Teardown
 *
 * Deletes the ephemeral Neon branch after all E2E tests complete.
 * This cleans up the temporary test database.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Use process.cwd() since Playwright runs from portal package root
const dbPackagePath = resolve(process.cwd(), "../db");
const envTestFile = resolve(dbPackagePath, ".env.test");

async function globalTeardown() {
  console.log("\n🧹 E2E Global Teardown: Cleaning up ephemeral branch...\n");

  // Skip if .env.test doesn't exist (nothing to clean up)
  if (!existsSync(envTestFile)) {
    console.log("   ⚠️  No .env.test found, nothing to clean up\n");
    return;
  }

  // Skip cleanup if KEEP_TEST_BRANCH is set (useful for debugging)
  if (process.env.KEEP_TEST_BRANCH) {
    console.log("   ⚠️  KEEP_TEST_BRANCH is set, skipping cleanup");
    console.log("   Run `pnpm db:test:cleanup` manually when done\n");
    return;
  }

  try {
    execSync("tsx scripts/ephemeral-branch.ts delete", {
      cwd: dbPackagePath,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("⚠️  Failed to delete ephemeral branch:", error);
    // Don't throw - we don't want to fail the test run on cleanup errors
  }

  console.log("\n✅ Ephemeral branch cleanup complete\n");
}

export default globalTeardown;
