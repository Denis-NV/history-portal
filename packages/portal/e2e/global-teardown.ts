/**
 * Playwright Global Teardown
 *
 * Deletes the ephemeral Neon branch after all E2E tests complete.
 * This cleans up the temporary test database.
 *
 * Each test runner (Vitest, Playwright) manages its own branch independently.
 * This ensures complete isolation between unit tests and E2E tests.
 *
 * Skips cleanup if:
 * - KEEP_TEST_BRANCH is set (for debugging)
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout } from "node:timers/promises";

// Use process.cwd() since Playwright runs from portal package root
const dbPackagePath = resolve(process.cwd(), "../db");
const envTestFile = resolve(dbPackagePath, ".env.test");

async function globalTeardown() {
  console.log("\n🧹 E2E Global Teardown\n");

  // Skip if .env.test doesn't exist (nothing to clean up)
  if (!existsSync(envTestFile)) {
    console.log("   No ephemeral branch to clean up\n");
    return;
  }

  // Skip cleanup if KEEP_TEST_BRANCH is set (for debugging)
  if (process.env.KEEP_TEST_BRANCH) {
    console.log("   ⚠️  KEEP_TEST_BRANCH is set, skipping cleanup");
    console.log("   Run `rm packages/db/.env.test` when done\n");
    return;
  }

  // Wait for WebServer connections to close gracefully
  console.log("   Waiting for connections to close...\n");
  await setTimeout(2000);

  console.log("   Deleting ephemeral branch...\n");
  try {
    execSync("pnpm exec tsx scripts/ephemeral-branch.ts delete", {
      cwd: dbPackagePath,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("⚠️  Failed to delete ephemeral branch:", error);
    // Don't throw - we don't want to fail the test run on cleanup errors
  }

  console.log("\n✅ E2E cleanup complete\n");
}

export default globalTeardown;
