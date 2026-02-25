import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },

  test: {
    include: ["src/**/*.integration.test.{ts,tsx}"],
    exclude: ["node_modules"],

    // Database tests must run sequentially (RLS policies test one user at a time)
    fileParallelism: false,

    // Testcontainer setup/teardown
    globalSetup: ["./src/test-utils/integration/global-setup.ts"],
    setupFiles: ["./src/test-utils/integration/setup.ts"],

    // Node environment for database operations
    environment: "node",

    // Longer timeouts for database operations
    testTimeout: 10000,
    hookTimeout: 30000,
  },
});
