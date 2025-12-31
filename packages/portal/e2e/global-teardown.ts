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

import { spawnSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
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
  // Neon needs time to terminate connections before branch can be deleted
  console.log("   Waiting for connections to close...\n");
  await setTimeout(5000);

  // Retry branch deletion up to 3 times with increasing delays
  // This handles transient connection issues
  let deleted = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`   Deleting ephemeral branch (attempt ${attempt}/3)...\n`);
    try {
      const result = spawnSync(
        "pnpm",
        ["exec", "tsx", "scripts/ephemeral-branch.ts", "delete"],
        {
          cwd: dbPackagePath,
          encoding: "utf-8",
          stdio: "inherit",
        }
      );

      if (result.status === 0) {
        deleted = true;
        break;
      }
    } catch (error) {
      console.error(`   ⚠️  Attempt ${attempt} failed:`, error);
    }

    if (attempt < 3) {
      console.log(`   Waiting before retry...\n`);
      await setTimeout(3000);
    }
  }

  if (!deleted) {
    // Last resort: try to clean up .env.test anyway
    console.error("   ⚠️  Could not delete branch after 3 attempts");
    console.error("   Branch may need manual cleanup in Neon console");

    if (existsSync(envTestFile)) {
      unlinkSync(envTestFile);
      console.log(`   ✅ Removed ${envTestFile}\n`);
    }
  }

  console.log("✅ E2E cleanup complete\n");
}

export default globalTeardown;
