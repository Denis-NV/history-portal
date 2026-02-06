/**
 * Mock Authentication Utilities
 *
 * Provides utilities for mocking authentication in Vitest tests.
 * Use these when testing Server Actions or API routes that require authentication.
 *
 * @example
 * ```ts
 * import { vi } from "vitest";
 * import { createMockSession, TEST_USERS } from "@/db/test-utils";
 *
 * // Mock the session module
 * vi.mock("@/lib/auth/session", () => ({
 *   getSession: vi.fn(),
 *   requireSession: vi.fn(),
 * }));
 *
 * import { requireSession } from "@/lib/auth/session";
 *
 * test("authenticated action", async () => {
 *   vi.mocked(requireSession).mockResolvedValue(createMockSession(TEST_USERS.alice));
 *   // ... test the action
 * });
 * ```
 */

import type { TestUser } from "./users";

/**
 * Session object structure matching Better Auth's session format
 */
export type MockSession = {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  };
};

/**
 * Create a mock session for a test user
 *
 * @param user - Test user object from TEST_USERS
 * @returns A mock session object compatible with Better Auth
 *
 * @example
 * ```ts
 * const session = createMockSession(TEST_USERS.alice);
 * vi.mocked(requireSession).mockResolvedValue(session);
 * ```
 */
export function createMockSession(user: TestUser): MockSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: `test-session-${user.id}`,
      userId: user.id,
      token: `test-token-${user.id}`,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    },
  };
}

/**
 * Create a mock session object for direct use (without user lookup)
 *
 * @param userId - The user ID to create a session for
 * @param overrides - Optional overrides for user properties
 * @returns A mock session object
 */
export function createMockSessionById(
  userId: string,
  overrides?: Partial<MockSession["user"]>
): MockSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    user: {
      id: userId,
      email: overrides?.email ?? `${userId}@test.local`,
      name: overrides?.name ?? "Test User",
      role: overrides?.role ?? "user",
      emailVerified: overrides?.emailVerified ?? true,
      image: overrides?.image ?? null,
      createdAt: overrides?.createdAt ?? now,
      updatedAt: overrides?.updatedAt ?? now,
    },
    session: {
      id: `test-session-${userId}`,
      userId,
      token: `test-token-${userId}`,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    },
  };
}
