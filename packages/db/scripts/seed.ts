/**
 * Database Seed Script
 *
 * Seeds the database with initial data.
 * Uses Drizzle ORM inserts with onConflictDoNothing for idempotency.
 *
 * Usage:
 *   pnpm seed                       # Seed using DATABASE_URL from .env.local
 *   DATABASE_URL=... pnpm seed      # Seed a specific database
 */

import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool as PgPool } from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { seed } from "drizzle-seed";

import * as schema from "../src/schema";
import { connectionString, isLocalDocker, isNeon } from "../src/config";

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

    console.log("📝 Seeding sample cards...");

    // Get user ID from JSON for linking cards
    const testUserId = seedUsers[0].id;

    // Fixed ID for the random test user (allows idempotent seeding)
    const randomUserId = "11111111-1111-1111-1111-111111111111";

    // Delete the random user if it exists (for clean re-seeding)
    await db.delete(schema.user).where(eq(schema.user.id, randomUserId));

    // Create the random test user
    await db
      .insert(schema.user)
      .values({
        id: randomUserId,
        name: "Random Test User",
        email: "random@example.com",
        emailVerified: true,
        role: "user",
      })
      .onConflictDoNothing();
    console.log("   ✅ Random user seeded");

    // Clear existing cards for clean re-seeding (drizzle-seed uses deterministic IDs)
    await db.delete(schema.card);

    // Generate random cards for JSON test user
    await seed(db, { card: schema.card }).refine((f) => ({
      card: {
        count: 15,
        columns: {
          userId: f.default({ defaultValue: testUserId }),
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
    console.log("   ✅ Cards seeded for test user (15)");

    // Generate random cards for random user (use different seed to avoid ID collision)
    await seed(db, { card: schema.card }, { seed: 12345 }).refine((f) => ({
      card: {
        count: 10,
        columns: {
          userId: f.default({ defaultValue: randomUserId }),
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
    console.log("   ✅ Cards seeded for random user (10)");

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
