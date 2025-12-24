import type { Card } from "@history-portal/db";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cards - Response
// ─────────────────────────────────────────────────────────────────────────────

export type CardWithUser = Card & {
  userName: string;
};

export type CardsResponse = {
  cards: CardWithUser[];
};
