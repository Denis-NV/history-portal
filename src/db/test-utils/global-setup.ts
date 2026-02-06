/**
 * Vitest Global Setup for Database Tests
 *
 * Creates an ephemeral Neon branch before RLS tests run.
 * The branch is deleted in teardown to avoid data contamination.
 *
 * Each test runner (Vitest, Playwright) manages its own branch independently.
 * This ensures complete isolation between unit tests and E2E tests.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../../..");
const envTestFile = resolve(projectRoot, ".env.test");

export async function setup() {
  console.log("\n🧪 Vitest Global Setup");

  // Clean up any stale .env.test from previous run
  if (existsSync(envTestFile)) {
    console.log("   Cleaning up stale .env.test...");
    unlinkSync(envTestFile);
  }

  // Create fresh ephemeral branch
  console.log("   Creating ephemeral Neon branch...\n");
  try {
    execSync("tsx scripts/db/ephemeral-branch.ts create", {
      cwd: projectRoot,
      stdio: "inherit",
    });

    // Load the created .env.test
    if (existsSync(envTestFile)) {
      const content = readFileSync(envTestFile, "utf-8");
      const match = content.match(/^DATABASE_URL="(.+)"$/m);
      if (match) {
        process.env.DATABASE_URL = match[1];
      }
    }
  } catch (error) {
    console.error("❌ Failed to create ephemeral branch:", error);
    throw error;
  }

  console.log("\n✅ Ephemeral branch ready for database tests\n");
}

export async function teardown() {
  console.log("\n🧹 Vitest Global Teardown");

  // Skip if .env.test doesn't exist (no ephemeral branch was created)
  if (!existsSync(envTestFile)) {
    console.log("   No ephemeral branch to clean up\n");
    return;
  }

  // Skip cleanup if KEEP_TEST_BRANCH is set (for debugging)
  if (process.env.KEEP_TEST_BRANCH) {
    console.log("   ⚠️  KEEP_TEST_BRANCH is set, skipping cleanup\n");
    return;
  }

  console.log("   Cleaning up ephemeral branch...\n");
  try {
    execSync("tsx scripts/db/ephemeral-branch.ts delete", {
      cwd: projectRoot,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("⚠️  Failed to delete ephemeral branch:", error);
  }

  console.log("\n✅ Vitest cleanup complete\n");
}
