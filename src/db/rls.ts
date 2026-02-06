import { dbPool } from "./client";
import { sql } from "drizzle-orm";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/**
 * Transaction type for RLS operations.
 * Supports both node-postgres (local) and neon-serverless (production) drivers.
 */
export type RLSTransaction = PgTransaction<
  PgQueryResultHKT,
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
  operation: (tx: RLSTransaction) => Promise<T>
): Promise<T> {
  // Validate userId is a valid UUID to prevent SQL injection
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error("Invalid user ID format");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return dbPool.transaction(async (tx: any) => {
    // Switch to app_user role which doesn't have BYPASSRLS
    // This ensures RLS policies are enforced
    await tx.execute(sql.raw(`SET LOCAL ROLE app_user`));

    // Set the user ID for RLS policies
    // Note: SET doesn't support parameterized queries, so we use raw SQL
    // The UUID validation above prevents SQL injection
    await tx.execute(sql.raw(`SET LOCAL app.user_id = '${userId}'`));

    return operation(tx as RLSTransaction);
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
  operation: (tx: RLSTransaction) => Promise<T>
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return dbPool.transaction(async (tx: any) => {
    // Set admin flag to bypass RLS
    await tx.execute(sql`SET LOCAL app.is_admin = 'true'`);

    return operation(tx as RLSTransaction);
  });
}
