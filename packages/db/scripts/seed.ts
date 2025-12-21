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
const { eq } = await import("drizzle-orm");
const { Pool: PgPool } = await import("pg");
const { readFileSync } = await import("node:fs");
const { seed, reset } = await import("drizzle-seed");

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

    // ─────────────────────────────────────────────────────────────────────────
    // Generate random seed data with drizzle-seed
    // ─────────────────────────────────────────────────────────────────────────

    console.log("📝 Generating random seed data with drizzle-seed...");

    // Get user ID from JSON for linking userLayer
    const testUserId = seedUsers[0].id;

    // Fixed ID for the random test user (allows idempotent seeding)
    const randomUserId = "11111111-1111-1111-1111-111111111111";

    // Delete the random user if it exists (for clean re-seeding)
    await db.delete(schema.user).where(eq(schema.user.id, randomUserId));

    // Reset tables we're generating (not the JSON user/account)
    await reset(db, {
      layer: schema.layer,
      card: schema.card,
      cardLayer: schema.cardLayer,
      userLayer: schema.userLayer,
    });

    // Create the random test user with manual insert
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
    console.log("   ✅ Random user seeded (1)");

    await seed(db, {
      layer: schema.layer,
      card: schema.card,
    }).refine((f) => ({
      layer: {
        count: 3,
        columns: {
          title: f.valuesFromArray({
            values: ["Ancient Civilizations", "Medieval History", "World Wars"],
          }),
        },
      },
      card: {
        count: 20,
        columns: {
          title: f.loremIpsum({ sentencesCount: 1 }),
          summary: f.loremIpsum({ sentencesCount: 1 }),
          startYear: f.int({ minValue: -3000, maxValue: 2020 }),
          // Optional fields: weighted random with ~70% null
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

    console.log("   ✅ Layers seeded (3)");
    console.log("   ✅ Cards seeded (20)");

    // Get all cards and layers for manual relationship creation
    const allCards = await db.select({ id: schema.card.id }).from(schema.card);
    const allLayers = await db
      .select({ id: schema.layer.id })
      .from(schema.layer);

    // Create card-layer relationships: assign each card to one random layer
    const cardLayerValues = allCards.map((card, index) => ({
      cardId: card.id,
      layerId: allLayers[index % allLayers.length].id,
    }));

    await db
      .insert(schema.cardLayer)
      .values(cardLayerValues)
      .onConflictDoNothing();
    console.log(
      `   ✅ Card-Layer relationships seeded (${cardLayerValues.length})`
    );

    // Seed userLayer manually for deterministic role assignment
    // Layer 0: JSON user = owner
    // Layer 1: JSON user = owner, Random user = guest
    // Layer 2: Random user = owner
    const userLayerValues = [
      // JSON user owns layers 0 and 1
      { userId: testUserId, layerId: allLayers[0].id, role: "owner" as const },
      { userId: testUserId, layerId: allLayers[1].id, role: "guest" as const },
      // Random user is guest on layer 1, owner of layer 2
      {
        userId: randomUserId,
        layerId: allLayers[1].id,
        role: "editor" as const,
      },
      {
        userId: randomUserId,
        layerId: allLayers[2].id,
        role: "owner" as const,
      },
    ];

    await db
      .insert(schema.userLayer)
      .values(userLayerValues)
      .onConflictDoNothing();
    console.log(
      `   ✅ User-Layer relationships seeded (${userLayerValues.length})`
    );

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
