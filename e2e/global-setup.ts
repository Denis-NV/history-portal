/**
 * Playwright Global Setup
 *
 * Loads DATABASE_URL from .env.test into the Playwright process.
 * The .env.test file is created by the webServer script (e2e/dev-server.ts)
 * which starts a Testcontainer before Next.js.
 *
 * Note: Playwright starts webServer BEFORE globalSetup, so the
 * Testcontainer and .env.test are created by the webServer command,
 * not here. This file just loads the env for the Playwright process.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ENV_TEST_FILE = resolve(process.cwd(), ".env.test");

async function globalSetup() {
  if (existsSync(ENV_TEST_FILE)) {
    const content = readFileSync(ENV_TEST_FILE, "utf-8");
    const match = content.match(/DATABASE_URL="(.+)"/);
    if (match) {
      process.env.DATABASE_URL = match[1];
    }
  }
}

export default globalSetup;
