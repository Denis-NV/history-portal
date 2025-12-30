/**
 * Database Seed Script
 *
 * Seeds the database with test users and sample data.
 * Uses Drizzle ORM inserts with onConflictDoNothing for idempotency.
 *
 * Test Users (all passwords: Test123!):
 *   - alice@test.local (15 cards) - Primary dev/test user
 *   - bob@test.local (10 cards) - Multi-user RLS tests
 *   - carol@test.local (0 cards) - Empty state testing
 *   - admin@test.local (0 cards) - Admin role
 *
 * Usage:
 *   pnpm seed                       # Seed using DATABASE_URL from .env.local
 *   DATABASE_URL=... pnpm seed      # Seed a specific database
 */

import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { seed } from "drizzle-seed";

import * as schema from "../src/schema";
import { connectionString, isLocalDocker, isNeon } from "../src/config";

// ─────────────────────────────────────────────────────────────────────────────
// Test User IDs (used for RLS tests and auth)
// ─────────────────────────────────────────────────────────────────────────────

export const TEST_USERS = {
  alice: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  bob: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  carol: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  admin: "dddddddd-dddd-dddd-dddd-dddddddddddd",
} as const;

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

    // ─────────────────────────────────────────────────────────────────────────
    // Generate sample cards for test users
    // ─────────────────────────────────────────────────────────────────────────
    // Alice: 15 cards (primary test user)
    // Bob: 10 cards (for multi-user RLS tests)
    // Carol: 0 cards (empty state testing)
    // Admin: 0 cards (admin role testing)
    // ─────────────────────────────────────────────────────────────────────────

    console.log("📝 Seeding sample cards...");

    // Clear existing cards for clean re-seeding (drizzle-seed uses deterministic IDs)
    await db.delete(schema.card);

    // Generate cards for Alice (15 cards)
    await seed(db, { card: schema.card }).refine((f) => ({
      card: {
        count: 15,
        columns: {
          userId: f.default({ defaultValue: TEST_USERS.alice }),
          title: f.loremIpsum({ sentencesCount: 1 }),
          summary: f.loremIpsum({ sentencesCount: 2 }),
          startYear: f.int({ minValue: -3000, maxValue: 2020 }),
          startMonth: f.weightedRandom([
            { weight: 0.7, value: f.default({ defaultValue: undefined }) },
            { weight: 0.3, value: f.int({ minValue: 1, maxValue: 12 }) },
          ]),
          startDay: f.weightedRandom([
            { weight: 0.7, value: f.default({ defaultValue: undefined }) },
            { weight: 0.3, value: f.int({ minValue: 1, maxValue: 28 }) },
          ]),
          endYear: f.weightedRandom([
            { weight: 0.6, value: f.default({ defaultValue: undefined }) },
            { weight: 0.4, value: f.int({ minValue: -2000, maxValue: 2020 }) },
          ]),
          endMonth: f.weightedRandom([
            { weight: 0.7, value: f.default({ defaultValue: undefined }) },
            { weight: 0.3, value: f.int({ minValue: 1, maxValue: 12 }) },
          ]),
          endDay: f.weightedRandom([
            { weight: 0.7, value: f.default({ defaultValue: undefined }) },
            { weight: 0.3, value: f.int({ minValue: 1, maxValue: 28 }) },
          ]),
          article: f.weightedRandom([
            { weight: 0.5, value: f.default({ defaultValue: undefined }) },
            { weight: 0.5, value: f.loremIpsum({ sentencesCount: 5 }) },
          ]),
        },
      },
    }));
    console.log("   ✅ Cards seeded for Alice (15)");

    // Generate cards for Bob (10 cards, different seed)
    await seed(db, { card: schema.card }, { seed: 12345 }).refine((f) => ({
      card: {
        count: 10,
        columns: {
          userId: f.default({ defaultValue: TEST_USERS.bob }),
          title: f.loremIpsum({ sentencesCount: 1 }),
          summary: f.loremIpsum({ sentencesCount: 2 }),
          startYear: f.int({ minValue: -3000, maxValue: 2020 }),
          startMonth: f.weightedRandom([
            { weight: 0.7, value: f.default({ defaultValue: undefined }) },
            { weight: 0.3, value: f.int({ minValue: 1, maxValue: 12 }) },
          ]),
          startDay: f.weightedRandom([
            { weight: 0.7, value: f.default({ defaultValue: undefined }) },
            { weight: 0.3, value: f.int({ minValue: 1, maxValue: 28 }) },
          ]),
          endYear: f.weightedRandom([
            { weight: 0.6, value: f.default({ defaultValue: undefined }) },
            { weight: 0.4, value: f.int({ minValue: -2000, maxValue: 2020 }) },
          ]),
          endMonth: f.weightedRandom([
            { weight: 0.7, value: f.default({ defaultValue: undefined }) },
            { weight: 0.3, value: f.int({ minValue: 1, maxValue: 12 }) },
          ]),
          endDay: f.weightedRandom([
            { weight: 0.7, value: f.default({ defaultValue: undefined }) },
            { weight: 0.3, value: f.int({ minValue: 1, maxValue: 28 }) },
          ]),
          article: f.weightedRandom([
            { weight: 0.5, value: f.default({ defaultValue: undefined }) },
            { weight: 0.5, value: f.loremIpsum({ sentencesCount: 5 }) },
          ]),
        },
      },
    }));
    console.log("   ✅ Cards seeded for Bob (10)");
    console.log("   ℹ️  Carol and Admin have 0 cards (by design)");

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
