/**
 * Database Seed Script
 *
 * Seeds the database with test users and sample data.
 * All data is generated programmatically from TEST_USERS constants.
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
import { randomBytes } from "node:crypto";
import { seed } from "drizzle-seed";
import { scrypt as scryptSync } from "@noble/hashes/scrypt.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import * as schema from "../src/schema";
import { connectionString } from "../src/config";
import { TEST_USERS, TEST_PASSWORD } from "../src/test-utils/users";

// ─────────────────────────────────────────────────────────────────────────────
// Password Hashing (Better Auth compatible - scrypt with exact parameters)
// Better Auth uses @noble/hashes/scrypt with: N=16384, r=16, p=1, dkLen=64
// ─────────────────────────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  const salt = bytesToHex(randomBytes(16));
  const key = scryptSync(password.normalize("NFKC"), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
  });
  return `${salt}:${bytesToHex(key)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Client Setup (Neon Serverless)
// ─────────────────────────────────────────────────────────────────────────────

async function runSeed() {
  console.log("🌱 Starting database seed...");

  const sql = neon(connectionString);
  const db = drizzleHttp(sql, { schema });

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Seed Users from TEST_USERS constant
    // ─────────────────────────────────────────────────────────────────────────

    const testUsers = Object.values(TEST_USERS);
    console.log(`📝 Seeding ${testUsers.length} user(s)...`);

    for (const user of testUsers) {
      await db
        .insert(schema.user)
        .values({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: true,
          role: user.role,
          image: null,
        })
        .onConflictDoNothing();
    }
    console.log("   ✅ Users seeded");

    // ─────────────────────────────────────────────────────────────────────────
    // Seed Accounts with hashed password
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`📝 Seeding ${testUsers.length} account(s)...`);
    console.log("   🔐 Hashing passwords...");

    for (const user of testUsers) {
      const hashedPassword = hashPassword(TEST_PASSWORD);
      // Generate account ID: replace last segment with 0001...
      const accountId = user.id.slice(0, -12) + "000000000001";

      await db
        .insert(schema.account)
        .values({
          id: accountId,
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hashedPassword,
          accessToken: null,
          refreshToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          scope: null,
          idToken: null,
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
          userId: f.default({ defaultValue: TEST_USERS.alice.id }),
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
          userId: f.default({ defaultValue: TEST_USERS.bob.id }),
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
  }
}

// Run the seed
runSeed();
