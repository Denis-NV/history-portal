/**
 * Vitest Global Setup for Database Tests
 *
 * Creates an ephemeral Neon branch before RLS tests run.
 * This ensures database tests run against a fresh, isolated database.
 *
 * Note: This only runs when testing against Neon (not local Docker).
 * Local Docker tests use the existing local database.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPackagePath = resolve(__dirname, "../..");
const envTestFile = resolve(dbPackagePath, ".env.test");

export async function setup() {
  const isLocal = !process.env.DATABASE_URL;

  console.log("\n🧪 Vitest Global Setup");
  console.log(`   Mode: ${isLocal ? "Local Docker" : "Neon"}`);

  // If using local Docker, no ephemeral branch needed
  if (isLocal) {
    console.log("   Using local Docker database\n");
    return;
  }

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

  // Create ephemeral branch for Neon testing
  console.log("   Creating ephemeral Neon branch...\n");
  try {
    execSync("tsx scripts/ephemeral-branch.ts create", {
      cwd: dbPackagePath,
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
  const isLocal = !process.env.DATABASE_URL?.includes("neon.tech");

  console.log("\n🧹 Vitest Global Teardown");

  // If using local Docker, no cleanup needed
  if (isLocal) {
    console.log("   Local Docker - no cleanup needed\n");
    return;
  }

  // Skip if .env.test doesn't exist
  if (!existsSync(envTestFile)) {
    console.log("   No ephemeral branch to clean up\n");
    return;
  }

  // Skip cleanup if KEEP_TEST_BRANCH is set
  if (process.env.KEEP_TEST_BRANCH) {
    console.log("   ⚠️  KEEP_TEST_BRANCH is set, skipping cleanup\n");
    return;
  }

  console.log("   Cleaning up ephemeral branch...\n");
  try {
    execSync("tsx scripts/ephemeral-branch.ts delete", {
      cwd: dbPackagePath,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("⚠️  Failed to delete ephemeral branch:", error);
  }

  console.log("\n✅ Cleanup complete\n");
}
