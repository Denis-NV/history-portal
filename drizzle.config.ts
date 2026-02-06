import { defineConfig } from "drizzle-kit";

import { connectionString } from "./src/db/config";

// ─────────────────────────────────────────────────────────────────────────────
// Drizzle Kit Configuration
// ─────────────────────────────────────────────────────────────────────────────
// Uses postgres.js driver for migrations (installed as dev dependency).
// Connection string defaults are shared with runtime via ./src/config.ts
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: connectionString,
  },
});
