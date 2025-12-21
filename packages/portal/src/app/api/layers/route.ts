import { db, layer } from "@history-portal/db";
import { NextResponse } from "next/server";

/**
 * Get all layers
 * GET /api/layers
 *
 * NOTE: This endpoint intentionally does NOT filter by user_id.
 * This will return ALL layers in the database, which is incorrect.
 * RLS policies will be added later to fix this security issue.
 */
export async function GET() {
  try {
    const layers = await db.select().from(layer);

    return NextResponse.json({ layers });
  } catch (error) {
    console.error("Failed to fetch layers:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
