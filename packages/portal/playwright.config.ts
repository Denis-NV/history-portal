import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
import { config } from "dotenv";

// Load .env.test from db package (for ephemeral branch DATABASE_URL)
// Child processes (Next.js dev server) inherit these env vars
config({ path: resolve(__dirname, "../db/.env.test"), quiet: true });

/**
 * Playwright Configuration for E2E Tests
 *
 * Test Strategy:
 * - Creates an ephemeral Neon branch for test isolation (via globalSetup)
 * - Uses seeded test users (Alice, Bob, Carol, Admin) for user-based isolation
 * - Each user has their own authenticated storage state
 * - Tests can run in parallel without conflicting because each user has unique data
 * - Cleans up ephemeral branch after tests complete (via globalTeardown)
 *
 * Test Users:
 * - alice@test.com (15 cards) - Primary test user
 * - bob@test.com (10 cards) - Secondary test user
 * - carol@test.com (0 cards) - Empty state test user
 * - admin@test.com (admin role) - Admin functionality tests
 *
 * Environment:
 * - Set KEEP_TEST_BRANCH=1 to skip branch cleanup (for debugging)
 */

export default defineConfig({
  // Global setup creates ephemeral Neon branch
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  // Test directory
  testDir: "./e2e",

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: process.env.CI ? "github" : "html",

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: "http://localhost:3000",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Take screenshot on failure
    screenshot: "only-on-failure",
  },

  // Configure projects for major browsers
  projects: [
    // Setup project - authenticates test users and saves storage state
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    // Chrome tests - depend on setup
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use Alice's authenticated state by default
        storageState: "./e2e/.auth/alice.json",
      },
      dependencies: ["setup"],
    },

    // Firefox tests
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: "./e2e/.auth/alice.json",
      },
      dependencies: ["setup"],
    },

    // Safari tests
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: "./e2e/.auth/alice.json",
      },
      dependencies: ["setup"],
    },

    // Mobile Chrome tests
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        storageState: "./e2e/.auth/alice.json",
      },
      dependencies: ["setup"],
    },

    // Mobile Safari tests
    {
      name: "Mobile Safari",
      use: {
        ...devices["iPhone 12"],
        storageState: "./e2e/.auth/alice.json",
      },
      dependencies: ["setup"],
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
