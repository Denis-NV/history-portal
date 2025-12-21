import {
  card,
  cardLayer,
  layer,
  userLayer,
  withRLS,
  eq,
  and,
  inArray,
  sql,
} from "@history-portal/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { CardsRequest, CardsResponse } from "./types";

/**
 * Get all cards accessible to the current user
 * POST /api/cards
 *
 * Uses RLS to filter cards based on layer access.
 * Cards are returned only if they belong to a layer the user has access to.
 *
 * Request body:
 * - layerIds: array of layer IDs to filter by (optional, defaults to all accessible layers)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CardsRequest = await request.json().catch(() => ({}));
    const layerIds = body.layerIds?.filter(Boolean);

    const cards = await withRLS(session.user.id, async (tx) => {
      // Build base conditions - always filter by current user
      const baseCondition = sql`${userLayer.userId} = current_app_user_id()`;

      // Add layer filter if specific layers are requested
      const whereCondition =
        layerIds && layerIds.length > 0
          ? and(baseCondition, inArray(layer.id, layerIds))
          : baseCondition;

      // Build query to get cards with their layer info and user's role
      // RLS on layer table ensures we only see layers we have access to
      return tx
        .select({
          id: card.id,
          title: card.title,
          summary: card.summary,
          startYear: card.startYear,
          startMonth: card.startMonth,
          startDay: card.startDay,
          endYear: card.endYear,
          endMonth: card.endMonth,
          endDay: card.endDay,
          createdAt: card.createdAt,
          layerId: layer.id,
          layerTitle: layer.title,
          role: userLayer.role,
        })
        .from(card)
        .innerJoin(cardLayer, eq(cardLayer.cardId, card.id))
        .innerJoin(layer, eq(layer.id, cardLayer.layerId))
        .innerJoin(userLayer, eq(userLayer.layerId, layer.id))
        .where(whereCondition);
    });

    return NextResponse.json({ cards } satisfies CardsResponse);
  } catch (error) {
    console.error("Failed to fetch cards:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
