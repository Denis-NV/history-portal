// ─────────────────────────────────────────────────────────────────────────────
// @history-portal/db
// ─────────────────────────────────────────────────────────────────────────────
// Database client and schema exports for the history-portal project.
// Uses @neondatabase/serverless driver which works with both:
// - Local PostgreSQL (via neon-proxy in Docker)
// - Cloud Neon (staging/production)
// ─────────────────────────────────────────────────────────────────────────────

// Database clients
export { db, dbPool } from "./client";
export type { DbClient, DbPoolClient } from "./client";

// Schema exports (add tables here as they're created)
export * from "./schema";
