import { neon, neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";

import { connectionString, isLocal } from "./config";
import * as schema from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// Database Clients
// ─────────────────────────────────────────────────────────────────────────────

let db: ReturnType<typeof drizzleHttp> | ReturnType<typeof drizzlePg>;
let dbPool: ReturnType<typeof drizzleWs> | ReturnType<typeof drizzlePg>;

if (isLocal) {
  // ───────────────────────────────────────────────────────────────────────────
  // Local Development: Use standard pg driver
  // Simpler and more reliable than Neon HTTP proxy
  // ───────────────────────────────────────────────────────────────────────────
  const localConnectionString = connectionString.replace(
    "db.localtest.me",
    "localhost"
  );
  const pool = new PgPool({ connectionString: localConnectionString });

  db = drizzlePg(pool, { schema });
  dbPool = drizzlePg(pool, { schema });
} else {
  // ───────────────────────────────────────────────────────────────────────────
  // Production/Staging: Use Neon serverless driver
  // Optimized for serverless environments
  // ───────────────────────────────────────────────────────────────────────────
  neonConfig.webSocketConstructor = ws;

  const sql = neon(connectionString);
  const pool = new NeonPool({ connectionString });

  db = drizzleHttp(sql, { schema });
  dbPool = drizzleWs(pool, { schema });
}

export { db, dbPool };

// Export types
export type DbClient = typeof db;
export type DbPoolClient = typeof dbPool;
