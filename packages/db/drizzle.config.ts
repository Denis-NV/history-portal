import { config } from "dotenv";
import { resolve } from "node:path";

import { defineConfig } from "drizzle-kit";

import {
  LOCAL_DATABASE,
  LOCAL_HOST,
  LOCAL_PASSWORD,
  LOCAL_PORT,
  LOCAL_USER,
} from "./src/config";

// Load env from portal package where DATABASE_URL is typically set
// Must happen AFTER importing constants but BEFORE reading process.env
config({ path: resolve(process.cwd(), "../portal/.env.local") });
config({ path: resolve(process.cwd(), "../portal/.env") });

// Build connection string using same logic as src/config.ts
// (can't import connectionString directly due to ESM import hoisting)
const connectionString =
  process.env.DATABASE_URL ??
  `postgres://${LOCAL_USER}:${LOCAL_PASSWORD}@${LOCAL_HOST}:${LOCAL_PORT}/${LOCAL_DATABASE}`;

// ─────────────────────────────────────────────────────────────────────────────
// Drizzle Kit Configuration
// ─────────────────────────────────────────────────────────────────────────────
// Uses postgres.js driver for migrations (installed as dev dependency).
// Connection string defaults are shared with runtime via ./src/config.ts
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: connectionString,
  },
});
