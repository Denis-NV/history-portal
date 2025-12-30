import { test as base, expect } from "@playwright/test";
import { TEST_USERS, type TestUserKey } from "@history-portal/db/test-utils";

const STORAGE_STATE_DIR = "./e2e/.auth";

/**
 * Extended test fixtures for user-based testing
 *
 * Usage:
 * ```ts
 * import { test, expect } from './fixtures';
 *
 * // Use Alice (default)
 * test('can see timeline', async ({ page }) => {
 *   await page.goto('/timeline');
 *   await expect(page.getByText('Alice')).toBeVisible();
 * });
 *
 * // Use Bob explicitly
 * test.use({ userKey: 'bob' });
 * test('bob sees his cards', async ({ page, testUser }) => {
 *   await page.goto('/timeline');
 *   await expect(page.getByText(testUser.name)).toBeVisible();
 * });
 * ```
 */

// Define custom fixture types
type TestFixtures = {
  /** The current test user key */
  userKey: TestUserKey;
  /** The current test user data */
  testUser: (typeof TEST_USERS)[TestUserKey];
};

// Extend base test with custom fixtures
export const test = base.extend<TestFixtures>({
  // Default to Alice
  userKey: ["alice", { option: true }],

  // Provide test user data based on userKey
  testUser: async ({ userKey }, use) => {
    await use(TEST_USERS[userKey]);
  },

  // Override storageState based on userKey
  storageState: async ({ userKey }, use) => {
    await use(`${STORAGE_STATE_DIR}/${userKey}.json`);
  },
});

// Re-export expect for convenience
export { expect };
