import { test as setup, expect } from "@playwright/test";
import { TEST_USERS, TEST_PASSWORD } from "./test-users";

const STORAGE_STATE_DIR = "./e2e/.auth";

/**
 * Authentication Setup
 *
 * This runs before all tests to authenticate each test user
 * and save their session state to reusable storage files.
 *
 * Each test user gets their own storage state file:
 * - alice.json - Primary test user (15 cards)
 * - bob.json - Secondary test user (10 cards)
 * - carol.json - Empty state user (0 cards)
 * - admin.json - Admin user
 */

// Authenticate Alice
setup("authenticate alice", async ({ page }) => {
  await authenticateUser(
    page,
    TEST_USERS.alice.email,
    `${STORAGE_STATE_DIR}/alice.json`
  );
});

// Authenticate Bob
setup("authenticate bob", async ({ page }) => {
  await authenticateUser(
    page,
    TEST_USERS.bob.email,
    `${STORAGE_STATE_DIR}/bob.json`
  );
});

// Authenticate Carol
setup("authenticate carol", async ({ page }) => {
  await authenticateUser(
    page,
    TEST_USERS.carol.email,
    `${STORAGE_STATE_DIR}/carol.json`
  );
});

// Authenticate Admin
setup("authenticate admin", async ({ page }) => {
  await authenticateUser(
    page,
    TEST_USERS.admin.email,
    `${STORAGE_STATE_DIR}/admin.json`
  );
});

/**
 * Helper function to authenticate a user and save storage state
 */
async function authenticateUser(
  page: import("@playwright/test").Page,
  email: string,
  storagePath: string
) {
  // Navigate to sign-in page
  await page.goto("/auth/sign-in");

  // Fill in credentials
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);

  // Submit the form
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for authentication to complete - look for sign out button which confirms auth
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible({
    timeout: 15000,
  });

  // Also verify we're on the timeline page
  await expect(page).toHaveURL(/.*timeline/, { timeout: 10000 });

  // Save storage state
  await page.context().storageState({ path: storagePath });
}
