/**
 * Test User Constants
 *
 * Predefined test users with known IDs for use in tests.
 * All users have password: Test123!
 *
 * @example
 * ```ts
 * import { TEST_USERS } from "@history-portal/db/test-utils";
 *
 * // Use in RLS tests
 * const cards = await withRLS(TEST_USERS.alice.id, async (tx) => {
 *   return tx.select().from(card);
 * });
 * ```
 */

export const TEST_USERS = {
  /**
   * Alice - Primary dev/test user
   * Has 15 seeded cards
   */
  alice: {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    email: "alice@test.local",
    name: "Alice Test",
    role: "user" as const,
  },

  /**
   * Bob - Secondary test user
   * Has 10 seeded cards, used for multi-user RLS tests
   */
  bob: {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    email: "bob@test.local",
    name: "Bob Test",
    role: "user" as const,
  },

  /**
   * Carol - Empty state test user
   * Has 0 cards, used for testing empty states
   */
  carol: {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    email: "carol@test.local",
    name: "Carol Test",
    role: "user" as const,
  },

  /**
   * Admin - Admin role test user
   * Has 0 cards, used for testing admin features
   */
  admin: {
    id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    email: "admin@test.local",
    name: "Admin Test",
    role: "admin" as const,
  },
} as const;

/**
 * Test user password (same for all test users)
 */
export const TEST_PASSWORD = "Test123!";

/**
 * Type for test user keys
 */
export type TestUserKey = keyof typeof TEST_USERS;

/**
 * Type for a test user object
 */
export type TestUser = (typeof TEST_USERS)[TestUserKey];
