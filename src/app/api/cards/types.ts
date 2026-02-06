import type { Card } from "@/db";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cards - Response
// ─────────────────────────────────────────────────────────────────────────────

export type CardWithUser = Card & {
  userName: string;
};

export type CardsResponse = {
  cards: CardWithUser[];
};
