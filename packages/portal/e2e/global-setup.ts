/**
 * Playwright Global Setup
 *
 * The ephemeral Neon branch is created by the webServer command BEFORE this runs.
 * This setup just loads the DATABASE_URL for the Playwright test runner process.
 *
 * The branch is:
 * - Created by webServer command (before Next.js starts)
 * - Migrated with latest schema + RLS policies
 * - Seeded with test data
 * - Deleted after tests complete (via globalTeardown)
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Use process.cwd() since Playwright runs from portal package root
const dbPackagePath = resolve(process.cwd(), "../db");
const envTestFile = resolve(dbPackagePath, ".env.test");

async function globalSetup() {
  console.log("\n🧪 E2E Global Setup\n");

  // Wait for webServer to create .env.test (it runs in parallel)
  // The webServer command creates the ephemeral branch before starting Next.js
  let attempts = 0;
  const maxAttempts = 60; // Wait up to 60 seconds

  while (!existsSync(envTestFile) && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
    if (attempts % 10 === 0) {
      console.log(`   Waiting for .env.test... (${attempts}s)\n`);
    }
  }

  // Load DATABASE_URL from .env.test and set in process.env
  if (existsSync(envTestFile)) {
    const content = readFileSync(envTestFile, "utf-8");
    const match = content.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
    if (match) {
      process.env.DATABASE_URL = match[1].trim();
      console.log("   ✅ Loaded DATABASE_URL from .env.test\n");
    }
  } else {
    console.error("   ❌ .env.test not found after waiting\n");
  }

  console.log("✅ E2E Global Setup complete\n");
}

export default globalSetup;
