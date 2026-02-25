/**
 * Vitest Global Setup for Database Tests
 *
 * Starts a PostgreSQL Testcontainer before RLS tests run.
 * The container is stopped in teardown.
 *
 * Each test runner (Vitest, Playwright) manages its own container independently.
 * This ensures complete isolation between unit tests and E2E tests.
 */

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../../..");

let container: StartedPostgreSqlContainer;

export async function setup() {
  console.log("\n🧪 Vitest Global Setup");
  console.log("   Starting PostgreSQL Testcontainer...\n");

  container = await new PostgreSqlContainer("postgres:17-alpine").start();

  const connectionString = container.getConnectionUri();
  process.env.DATABASE_URL = connectionString;
  process.env.BETTER_AUTH_URL = "http://localhost:3000";

  // Run migrations
  console.log("   Running migrations...\n");
  execSync("pnpm db:migrate:all", {
    cwd: projectRoot,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: connectionString },
  });

  // Seed test data
  console.log("\n   Seeding database...\n");
  execSync("pnpm db:seed", {
    cwd: projectRoot,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: connectionString },
  });

  console.log("\n✅ Testcontainer ready for database tests\n");
}

export async function teardown() {
  console.log("\n🧹 Vitest Global Teardown");

  if (container) {
    console.log("   Stopping Testcontainer...\n");
    await container.stop();
  }

  console.log("✅ Cleanup complete\n");
}
