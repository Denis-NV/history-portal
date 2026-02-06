import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },

  test: {
    // Include component tests (.test.tsx) and API tests (.test.ts)
    include: ["src/**/*.test.{ts,tsx}"],

    // Exclude E2E tests (Playwright) and db tests (separate vitest config)
    exclude: ["node_modules", "e2e/**", "src/db/**"],

    // Use happy-dom for component tests
    environment: "happy-dom",

    // Setup files for React Testing Library
    setupFiles: ["./vitest.setup.ts"],

    // Enable globals for cleaner test syntax (describe, it, expect)
    globals: true,

    // CSS handling
    css: true,

    // Coverage configuration (optional, enable when needed)
    // coverage: {
    //   provider: "v8",
    //   reporter: ["text", "json", "html"],
    //   include: ["src/**/*.{ts,tsx}"],
    //   exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
    // },
  },
});
