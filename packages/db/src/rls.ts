import { dbPool, sql } from "@history-portal/db";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NeonQueryResultHKT } from "drizzle-orm/neon-serverless";
import type * as schema from "./schema";

type Transaction = PgTransaction<
  NeonQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * Execute a database operation with RLS context.
 *
 * This sets `app.user_id` for the duration of the transaction,
 * allowing PostgreSQL RLS policies to access the current user's ID.
 *
 * @example
 * ```ts
 * const posts = await withRLS(userId, async (tx) => {
 *   return tx.select().from(posts);
 * });
 * ```
 */
export async function withRLS<T>(
  userId: string,
  operation: (tx: Transaction) => Promise<T>
): Promise<T> {
  return dbPool.transaction(async (tx) => {
    // Set the user ID for RLS policies
    await tx.execute(sql`SET LOCAL app.user_id = ${userId}`);

    return operation(tx);
  });
}

/**
 * Execute a database operation with admin bypass (no RLS filtering).
 *
 * Use this for admin operations that need to see all data.
 * The user's role should be verified before calling this.
 *
 * @example
 * ```ts
 * if (user.role === "admin") {
 *   const allPosts = await withAdminAccess(async (tx) => {
 *     return tx.select().from(posts);
 *   });
 * }
 * ```
 */
export async function withAdminAccess<T>(
  operation: (tx: Transaction) => Promise<T>
): Promise<T> {
  return dbPool.transaction(async (tx) => {
    // Set admin flag to bypass RLS
    await tx.execute(sql`SET LOCAL app.is_admin = 'true'`);

    return operation(tx);
  });
}
