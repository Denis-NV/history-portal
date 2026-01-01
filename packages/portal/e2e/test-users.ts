/**
 * Test User Constants for E2E Tests
 *
 * Imports from @history-portal/db package (single source of truth).
 * - JSON data: works natively in Node.js without TypeScript loader
 * - Types: use `import type` which is erased at compile time
 *
 * Note: We can't directly import TEST_USERS from @history-portal/db/test-utils
 * because that package exports TypeScript files, and Playwright's Node runtime
 * can't process .ts files without a loader. The JSON import works because
 * Node.js handles JSON natively.
 */

import usersData from "@history-portal/db/test-utils/users.json";
import type { TestUser, TestUserKey } from "@history-portal/db/test-utils";

export type { TestUser, TestUserKey };

export const TEST_USERS = usersData.users as {
  alice: TestUser;
  bob: TestUser;
  carol: TestUser;
  admin: TestUser;
};

export const TEST_PASSWORD = usersData.password;
