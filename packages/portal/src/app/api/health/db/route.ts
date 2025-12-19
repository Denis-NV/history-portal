import { db, sql } from "@history-portal/db";
import { NextResponse } from "next/server";

/**
 * Database health check endpoint
 * GET /api/health/db
 *
 * Returns database connection status and server time.
 * Use this to verify the database connection is working.
 */
export async function GET() {
  try {
    // Simple query to test connection - no tables required
    const result = await db.execute(sql`SELECT NOW() as server_time`);

    return NextResponse.json({
      status: "ok",
      database: "connected",
      serverTime: result.rows[0]?.server_time,
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
