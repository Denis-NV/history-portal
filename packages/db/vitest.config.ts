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

    // Global test setup
    setupFiles: ["./src/test-utils/setup.ts"],

    // Environment
    environment: "node",

    // Timeouts for database operations
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
