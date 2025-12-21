/**
 * Database Seed Script
 *
 * Seeds the database with initial data.
 * Uses Drizzle ORM inserts with onConflictDoNothing for idempotency.
 *
 * Usage:
 *   pnpm db:seed                    # Seed using DATABASE_URL from env/.env.local
 *   DATABASE_URL=... pnpm db:seed   # Seed a specific database
 */

import { config } from "dotenv";
import { resolve } from "node:path";

// Load .env.local from portal package BEFORE importing config
// (must be sync, before any dynamic imports)
config({ path: resolve(import.meta.dirname, "../../portal/.env.local") });
config({ path: resolve(import.meta.dirname, "../../portal/.env") });

// Dynamic imports to ensure env is loaded first
const { neon } = await import("@neondatabase/serverless");
const { drizzle: drizzleHttp } = await import("drizzle-orm/neon-http");
const { drizzle: drizzlePg } = await import("drizzle-orm/node-postgres");
const { Pool: PgPool } = await import("pg");
const { readFileSync } = await import("node:fs");

const schema = await import("../src/schema");
const { connectionString, isLocalDocker, isNeon } = await import(
  "../src/config"
);

// ─────────────────────────────────────────────────────────────────────────────
// Load Seed Data from JSON files
// ─────────────────────────────────────────────────────────────────────────────

const seedDir = resolve(import.meta.dirname, "../seed");

const seedUsers = JSON.parse(
  readFileSync(resolve(seedDir, "users.json"), "utf-8")
);

const seedAccounts = JSON.parse(
  readFileSync(resolve(seedDir, "accounts.json"), "utf-8")
);

// ─────────────────────────────────────────────────────────────────────────────
// Database Client Setup
// ─────────────────────────────────────────────────────────────────────────────

async function runSeed() {
  const envType = isLocalDocker
    ? "local (Docker)"
    : isNeon
    ? "remote (Neon)"
    : "unknown";
  console.log("🌱 Starting database seed...");
  console.log(`   Environment: ${envType}`);

  let db: ReturnType<typeof drizzleHttp> | ReturnType<typeof drizzlePg>;
  let pool: InstanceType<typeof PgPool> | null = null;

  if (isLocalDocker) {
    const localConnectionString = connectionString.replace(
      "db.localtest.me",
      "localhost"
    );
    pool = new PgPool({ connectionString: localConnectionString });
    db = drizzlePg(pool, { schema });
  } else {
    const sql = neon(connectionString);
    db = drizzleHttp(sql, { schema });
  }

  try {
    // Seed users first (accounts reference users)
    console.log(`📝 Seeding ${seedUsers.length} user(s)...`);
    for (const userData of seedUsers) {
      await db
        .insert(schema.user)
        .values({
          ...userData,
          createdAt: new Date(userData.createdAt),
          updatedAt: new Date(userData.updatedAt),
        })
        .onConflictDoNothing();
    }
    console.log("   ✅ Users seeded");

    // Seed accounts
    console.log(`📝 Seeding ${seedAccounts.length} account(s)...`);
    for (const accountData of seedAccounts) {
      await db
        .insert(schema.account)
        .values({
          ...accountData,
          accessTokenExpiresAt: accountData.accessTokenExpiresAt
            ? new Date(accountData.accessTokenExpiresAt)
            : null,
          refreshTokenExpiresAt: accountData.refreshTokenExpiresAt
            ? new Date(accountData.refreshTokenExpiresAt)
            : null,
          createdAt: new Date(accountData.createdAt),
          updatedAt: new Date(accountData.updatedAt),
        })
        .onConflictDoNothing();
    }
    console.log("   ✅ Accounts seeded");

    console.log("🎉 Database seeding complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run the seed
runSeed();
