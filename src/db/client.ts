import { neon, neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { getConnectionString } from "./config";
import * as schema from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// Database Clients (Neon Serverless) — Lazy Initialized
// ─────────────────────────────────────────────────────────────────────────────
// db     - HTTP client for simple queries (stateless, lower latency)
// dbPool - WebSocket pool for transactions and interactive queries
//
// Clients are created on first use via Proxy to avoid errors during Next.js
// build (DATABASE_URL is a runtime secret, unavailable at Docker build time).
// ─────────────────────────────────────────────────────────────────────────────

type HttpDb = ReturnType<typeof drizzleHttp<typeof schema>>;
type WsDb = ReturnType<typeof drizzleWs<typeof schema>>;

let _db: HttpDb;
let _dbPool: WsDb;

const initClients = () => {
  if (!_db) {
    const connectionString = getConnectionString();
    neonConfig.webSocketConstructor = ws;
    _db = drizzleHttp(neon(connectionString), { schema });
    _dbPool = drizzleWs(new NeonPool({ connectionString }), { schema });
  }
};

const lazyProxy = <T extends object>(getTarget: () => T): T =>
  new Proxy({} as T, {
    get: (_, prop) => {
      const target = getTarget();
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

export const db: HttpDb = lazyProxy(() => {
  initClients();
  return _db;
});

export const dbPool: WsDb = lazyProxy(() => {
  initClients();
  return _dbPool;
});

// Export types
export type DbClient = HttpDb;
export type DbPoolClient = WsDb;
