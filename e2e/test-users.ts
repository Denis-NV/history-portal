/**
 * Test User Constants for E2E Tests
 *
 * Imports from src/db/test-utils (single source of truth).
 * - JSON data: works natively in Node.js without TypeScript loader
 * - Types: use `import type` which is erased at compile time
 *
 * Note: We use relative paths because Playwright's Node runtime doesn't
 * resolve tsconfig path aliases (@/). The JSON import works because
 * Node.js handles JSON natively.
 */

import usersData from "../src/db/test-utils/users.json";
import type { TestUser, TestUserKey } from "../src/db/test-utils";

export type { TestUser, TestUserKey };

export const TEST_USERS = usersData.users as {
  alice: TestUser;
  bob: TestUser;
  carol: TestUser;
  admin: TestUser;
};

export const TEST_PASSWORD = usersData.password;
