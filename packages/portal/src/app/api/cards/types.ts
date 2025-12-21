import type { Card, Layer, LayerRole } from "@history-portal/db";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cards - Request
// ─────────────────────────────────────────────────────────────────────────────

export type CardsRequest = {
  layerIds?: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/cards - Response
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Card with layer context - includes the layer it belongs to and user's role
 */
export type CardWithLayer = Pick<
  Card,
  | "id"
  | "title"
  | "summary"
  | "startYear"
  | "startMonth"
  | "startDay"
  | "endYear"
  | "endMonth"
  | "endDay"
  | "createdAt"
> & {
  layerId: Layer["id"];
  layerTitle: Layer["title"];
  role: LayerRole;
};

export type CardsResponse = {
  cards: CardWithLayer[];
};
