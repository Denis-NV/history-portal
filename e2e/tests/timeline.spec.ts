import { test, expect } from "../fixtures";

/**
 * Timeline E2E Tests
 *
 * Tests the authenticated timeline experience.
 * Uses pre-authenticated storage state from auth.setup.ts
 */

test.describe("Timeline", () => {
  test("shows user name in header", async ({ page, testUser }) => {
    await page.goto("/timeline");

    // User should see their name in the header
    await expect(page.getByText(testUser.name)).toBeVisible();
  });

  test("shows sign out button when authenticated", async ({ page }) => {
    await page.goto("/timeline");

    // Sign out button should be visible
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });

  test("redirects to sign-in when accessing timeline without auth", async ({
    browser,
  }) => {
    // Create a new context explicitly without any stored auth state
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    await page.goto("/timeline");

    // Should redirect to sign-in page
    await expect(page).toHaveURL(/\/auth\/sign-in/);

    await context.close();
  });
});
