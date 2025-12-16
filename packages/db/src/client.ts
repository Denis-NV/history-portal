import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

import { connectionString, isLocal } from './config';
import * as schema from './schema';

// ─────────────────────────────────────────────────────────────────────────────
// Local Development Configuration
// Configure Neon driver to work with local PostgreSQL via neon-proxy
// See: https://neon.com/guides/local-development-with-neon
// ─────────────────────────────────────────────────────────────────────────────

if (isLocal) {
  // Point HTTP requests to local neon-proxy
  neonConfig.fetchEndpoint = (host) => {
    const [protocol, port] =
      host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
    return `${protocol}://${host}:${port}/sql`;
  };

  // Configure WebSocket for local development
  const connectionStringUrl = new URL(connectionString);
  neonConfig.useSecureWebSocket =
    connectionStringUrl.hostname !== 'db.localtest.me';
  neonConfig.wsProxy = (host) =>
    host === 'db.localtest.me' ? `${host}:4444/v2` : `${host}/v2`;
}

// WebSocket constructor for Node.js environment
neonConfig.webSocketConstructor = ws;

// ─────────────────────────────────────────────────────────────────────────────
// Database Clients
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HTTP Client (sql) - Best for:
 * - Serverless functions and Lambda environments
 * - Stateless operations and quick queries
 * - Lower overhead for single queries
 * - Applications with sporadic database access
 */
const sql = neon(connectionString);

/**
 * WebSocket Client (pool) - Best for:
 * - Long-running applications (like servers)
 * - Maintains a persistent connection
 * - More efficient for multiple sequential queries
 * - High-frequency database operations
 */
const pool = new Pool({ connectionString });

// ─────────────────────────────────────────────────────────────────────────────
// Drizzle ORM Instances
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Drizzle HTTP client - for serverless/edge environments
 * Use this in API routes and server components
 */
export const db = drizzleHttp(sql, { schema });

/**
 * Drizzle WebSocket client - for long-running processes
 * Use this for scripts, migrations, or high-frequency operations
 */
export const dbPool = drizzleWs(pool, { schema });

// Export types
export type DbClient = typeof db;
export type DbPoolClient = typeof dbPool;
