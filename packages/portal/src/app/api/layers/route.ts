import { layer, withRLS } from "@history-portal/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

/**
 * Get all layers accessible to the current user
 * GET /api/layers
 *
 * Uses RLS to filter layers based on user_layer membership.
 * Only returns layers where the user has any role (owner, editor, guest).
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const layers = await withRLS(session.user.id, async (tx) => {
      return tx.select().from(layer);
    });

    return NextResponse.json({ layers });
  } catch (error) {
    console.error("Failed to fetch layers:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
