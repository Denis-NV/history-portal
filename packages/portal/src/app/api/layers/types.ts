import type { Layer } from "@history-portal/db";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/layers - Response
// ─────────────────────────────────────────────────────────────────────────────

export type LayersResponse = {
  layers: Layer[];
};
