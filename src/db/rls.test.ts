import { describe, it, expect } from "vitest";
import { withRLS, withAdminAccess } from "./rls";
import { card } from "./schema";
import { TEST_USERS } from "./test-utils";
import { count, eq } from "drizzle-orm";

/**
 * RLS (Row Level Security) Tests
 *
 * These tests verify that our RLS policies correctly isolate user data.
 * Each user should only see their own cards when using withRLS().
 *
 * Test Users (from seed):
 * - Alice: 15 cards
 * - Bob: 10 cards
 * - Carol: 0 cards
 * - Admin: 0 cards (but can see all via withAdminAccess)
 */

describe("RLS Policies", () => {
  describe("withRLS", () => {
    it("Alice can only see her own cards", async () => {
      const cards = await withRLS(TEST_USERS.alice.id, async (tx) => {
        return tx.select().from(card);
      });

      expect(cards).toHaveLength(15);
      expect(cards.every((c) => c.userId === TEST_USERS.alice.id)).toBe(true);
    });

    it("Bob can only see his own cards", async () => {
      const cards = await withRLS(TEST_USERS.bob.id, async (tx) => {
        return tx.select().from(card);
      });

      expect(cards).toHaveLength(10);
      expect(cards.every((c) => c.userId === TEST_USERS.bob.id)).toBe(true);
    });

    it("Carol sees no cards (empty state)", async () => {
      const cards = await withRLS(TEST_USERS.carol.id, async (tx) => {
        return tx.select().from(card);
      });

      expect(cards).toHaveLength(0);
    });

    it("Alice cannot access Bob's cards even with explicit filter", async () => {
      const cards = await withRLS(TEST_USERS.alice.id, async (tx) => {
        // Try to explicitly query Bob's cards - RLS should block this
        return tx.select().from(card).where(eq(card.userId, TEST_USERS.bob.id));
      });

      // RLS should return empty, not Bob's cards
      expect(cards).toHaveLength(0);
    });

    it("rejects invalid user ID format", async () => {
      await expect(
        withRLS("not-a-uuid", async (tx) => {
          return tx.select().from(card);
        })
      ).rejects.toThrow("Invalid user ID format");
    });
  });

  describe("withAdminAccess", () => {
    it("admin can see all cards across all users", async () => {
      const [result] = await withAdminAccess(async (tx) => {
        return tx.select({ total: count() }).from(card);
      });

      // Total cards: Alice (15) + Bob (10) + Carol (0) + Admin (0) = 25
      expect(result.total).toBe(25);
    });

    it("admin can query cards by any user", async () => {
      const aliceCards = await withAdminAccess(async (tx) => {
        return tx
          .select()
          .from(card)
          .where(eq(card.userId, TEST_USERS.alice.id));
      });

      const bobCards = await withAdminAccess(async (tx) => {
        return tx.select().from(card).where(eq(card.userId, TEST_USERS.bob.id));
      });

      expect(aliceCards).toHaveLength(15);
      expect(bobCards).toHaveLength(10);
    });
  });
});
