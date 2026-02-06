import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },

  test: {
    include: ["src/db/**/*.test.ts"],
    exclude: ["node_modules"],

    // Database tests must run sequentially (RLS policies test one user at a time)
    fileParallelism: false,

    // Ephemeral Neon branch setup/teardown
    globalSetup: ["./src/db/test-utils/global-setup.ts"],
    setupFiles: ["./src/db/test-utils/setup.ts"],

    // Node environment for database operations
    environment: "node",

    // Longer timeouts for database operations
    testTimeout: 10000,
    hookTimeout: 30000,
  },
});
