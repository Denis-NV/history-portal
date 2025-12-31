/**
 * Vitest Per-File Setup for Database Tests
 *
 * This file runs before each test file in the db package.
 * Global setup (ephemeral branch creation) is handled by global-setup.ts
 */

import { beforeAll, afterAll } from "vitest";

beforeAll(async () => {
  // Per-file setup can go here if needed
});

afterAll(async () => {
  // Per-file cleanup can go here if needed
});
