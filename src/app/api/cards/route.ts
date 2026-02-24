import { card, user, withRLS, eq } from "@/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getLogger } from "@/lib/telemetry";

const log = getLogger("api.cards");

export const dynamic = "force-dynamic";
import type { CardsResponse } from "./types";

/**
 * Get all cards for the current user
 * GET /api/cards
 *
 * Returns all cards owned by the authenticated user.
 * TODO: Add RLS policies for proper row-level security
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cards = await withRLS(session.user.id, async (tx) => {
      const rows = await tx
        .select({
          id: card.id,
          userId: card.userId,
          title: card.title,
          summary: card.summary,
          article: card.article,
          startYear: card.startYear,
          startMonth: card.startMonth,
          startDay: card.startDay,
          endYear: card.endYear,
          endMonth: card.endMonth,
          endDay: card.endDay,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
          userName: user.name,
        })
        .from(card)
        .innerJoin(user, eq(card.userId, user.id));
      return rows;
    });

    return NextResponse.json({ cards } satisfies CardsResponse);
  } catch (error) {
    log.error({ err: error }, "Failed to fetch cards");

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
