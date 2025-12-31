import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Include all test files with .test.ts extension
    include: ["src/**/*.test.ts"],

    // Exclude node_modules and build outputs
    exclude: ["node_modules", "bin"],

    // Run tests sequentially (no parallel file execution)
    // This allows transaction-based isolation without parallel conflicts
    fileParallelism: false,

    // Global setup for ephemeral branch management (Neon only)
    globalSetup: ["./src/test-utils/global-setup.ts"],

    // Per-file setup
    setupFiles: ["./src/test-utils/setup.ts"],

    // Environment
    environment: "node",

    // Timeouts for database operations (increased for branch creation)
    testTimeout: 10000,
    hookTimeout: 30000,
  },
});
