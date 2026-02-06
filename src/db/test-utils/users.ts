/**
 * Test User Constants
 *
 * Predefined test users with known IDs for use in tests.
 * All users have password: Test123!
 *
 * The data is stored in users.json (single source of truth) and imported here
 * with proper TypeScript types. This allows both Vitest and Playwright to
 * use the same data without duplication.
 *
 * @example
 * ```ts
 * import { TEST_USERS } from "@/db/test-utils";
 *
 * // Use in RLS tests
 * const cards = await withRLS(TEST_USERS.alice.id, async (tx) => {
 *   return tx.select().from(card);
 * });
 * ```
 */

import usersData from "./users.json" with { type: "json" };

/**
 * Test users with proper typing
 * - alice: Primary dev/test user (15 seeded cards)
 * - bob: Secondary test user (10 seeded cards, for multi-user RLS tests)
 * - carol: Empty state test user (0 cards)
 * - admin: Admin role test user (0 cards)
 */
export const TEST_USERS = usersData.users as {
  alice: TestUser;
  bob: TestUser;
  carol: TestUser;
  admin: TestUser;
};

/**
 * Test user password (same for all test users)
 */
export const TEST_PASSWORD = usersData.password;

/**
 * Type for a test user object
 */
export type TestUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
};

/**
 * Type for test user keys
 */
export type TestUserKey = keyof typeof TEST_USERS;
