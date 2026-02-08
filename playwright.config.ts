import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for E2E Tests
 *
 * Test Strategy:
 * - webServer command (e2e/dev-server.ts) starts a PostgreSQL Testcontainer,
 *   runs migrations + seed, then starts Next.js dev server
 * - globalSetup loads DATABASE_URL from .env.test for the Playwright process
 * - Uses seeded test users (Alice, Bob, Carol, Admin) for user-based isolation
 * - Each user has their own authenticated storage state
 * - Tests can run in parallel without conflicting because each user has unique data
 * - Testcontainer is stopped when Playwright terminates the webServer process
 *
 * Test Users:
 * - alice@test.local (15 cards) - Primary test user
 * - bob@test.local (10 cards) - Secondary test user
 * - carol@test.local (0 cards) - Empty state test user
 * - admin@test.local (admin role) - Admin functionality tests
 */

export default defineConfig({
  // Global setup loads DATABASE_URL from .env.test (created by webServer script)
  globalSetup: "./e2e/global-setup.ts",

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
  // Playwright starts webServer BEFORE globalSetup, so the Testcontainer
  // setup and Next.js startup are handled by the dev-server.ts script
  webServer: {
    command: "pnpm exec tsx e2e/dev-server.ts",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Testcontainer + migrations + seed + Next.js startup
    stdout: "pipe",
    stderr: "pipe",
  },
});
