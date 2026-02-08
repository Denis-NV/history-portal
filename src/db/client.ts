import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getConnectionString } from "./config";
import * as schema from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// Database Client (postgres.js) — Lazy Initialized
// ─────────────────────────────────────────────────────────────────────────────
// Single client for all queries (simple reads, transactions, RLS).
// postgres.js handles connection pooling internally.
//
// Created on first use via Proxy to avoid errors during Next.js build
// (DATABASE_URL is a runtime secret, unavailable at Docker build time).
// ─────────────────────────────────────────────────────────────────────────────

type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db;

const initClient = () => {
  if (!_db) {
    const connectionString = getConnectionString();
    const client = postgres(connectionString);
    _db = drizzle(client, { schema });
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

export const db: Db = lazyProxy(() => {
  initClient();
  return _db;
});

// Export types
export type DbClient = Db;
