import { neon, neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { connectionString } from "./config";
import * as schema from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// Database Clients (Neon Serverless)
// ─────────────────────────────────────────────────────────────────────────────
// db     - HTTP client for simple queries (stateless, lower latency)
// dbPool - WebSocket pool for transactions and interactive queries
// ─────────────────────────────────────────────────────────────────────────────

neonConfig.webSocketConstructor = ws;

const sql = neon(connectionString);
const pool = new NeonPool({ connectionString });

export const db = drizzleHttp(sql, { schema });
export const dbPool = drizzleWs(pool, { schema });

// Export types
export type DbClient = typeof db;
export type DbPoolClient = typeof dbPool;
