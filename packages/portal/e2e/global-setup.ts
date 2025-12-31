/**
 * Playwright Global Setup
 *
 * Creates an ephemeral Neon branch before E2E tests run.
 * The branch is deleted in globalTeardown to avoid data contamination.
 *
 * Each test runner (Vitest, Playwright) manages its own branch independently.
 * This ensures complete isolation between unit tests and E2E tests.
 *
 * The branch is:
 * - Created from main (staging) branch
 * - Migrated with latest schema + RLS policies
 * - Seeded with test data
 * - Deleted after tests complete (via globalTeardown)
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

// Use process.cwd() since Playwright runs from portal package root
const dbPackagePath = resolve(process.cwd(), "../db");
const envTestFile = resolve(dbPackagePath, ".env.test");

async function globalSetup() {
  console.log("\n🧪 E2E Global Setup\n");

  // Clean up any stale .env.test from previous run
  if (existsSync(envTestFile)) {
    console.log("   Cleaning up stale .env.test...\n");
    unlinkSync(envTestFile);
  }

  // Create fresh ephemeral branch
  console.log("   Creating ephemeral Neon branch...\n");
  try {
    execSync("pnpm exec tsx scripts/ephemeral-branch.ts create", {
      cwd: dbPackagePath,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("❌ Failed to create ephemeral branch:", error);
    throw error;
  }

  // Load DATABASE_URL from .env.test and set in process.env
  // This allows Playwright's webServer to inherit it
  if (existsSync(envTestFile)) {
    const content = readFileSync(envTestFile, "utf-8");
    const match = content.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
    if (match) {
      process.env.DATABASE_URL = match[1].trim();
      console.log("   Set DATABASE_URL from .env.test\n");
    }
  }

  console.log("\n✅ Ephemeral branch ready for E2E tests\n");
}

export default globalSetup;
