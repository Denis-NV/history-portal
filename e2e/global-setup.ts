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

// .env.test is at project root (created by webServer command)
const envTestFile = resolve(process.cwd(), ".env.test");

async function globalSetup() {
  console.log("\n🧪 E2E Global Setup\n");

  // Load DATABASE_URL from .env.test (created by webServer before Next.js started)
  if (existsSync(envTestFile)) {
    const content = readFileSync(envTestFile, "utf-8");
    const match = content.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
    if (match) {
      process.env.DATABASE_URL = match[1].trim();
      console.log("   ✅ Loaded DATABASE_URL from .env.test\n");
    }
  } else {
    console.error("   ❌ .env.test not found - webServer may have failed\n");
  }

  console.log("✅ E2E Global Setup complete\n");
}

export default globalSetup;
