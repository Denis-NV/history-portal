// ─────────────────────────────────────────────────────────────────────────────
// Cards Schema
// ─────────────────────────────────────────────────────────────────────────────
// This file defines the tables for cards and layers functionality.
//
// Tables:
// - card: Historical event cards with dates supporting BCE (negative years)
// - layer: Collections/categories for organizing cards
// - cardLayer: Junction table for card-layer many-to-many relationship
// - userLayer: Junction table for user-layer access with role-based permissions
//
// Date handling:
// - Years are stored as integers (negative for BCE, e.g., -4000 for 4000 BCE)
// - Month and day are optional for partial date precision
// ─────────────────────────────────────────────────────────────────────────────

import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const layerRoleEnum = pgEnum("layer_role", ["owner", "editor", "guest"]);

// ─────────────────────────────────────────────────────────────────────────────
// Card Table
// ─────────────────────────────────────────────────────────────────────────────

export const card = pgTable("card", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: varchar("summary", { length: 500 }),
  article: text("article"),

  // Start date (required year, optional month/day for precision)
  startYear: integer("start_year").notNull(),
  startMonth: integer("start_month"),
  startDay: integer("start_day"),

  // End date (all optional for ongoing/unknown end dates)
  endYear: integer("end_year"),
  endMonth: integer("end_month"),
  endDay: integer("end_day"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer Table
// ─────────────────────────────────────────────────────────────────────────────

export const layer = pgTable("layer", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Card-Layer Junction Table
// ─────────────────────────────────────────────────────────────────────────────

export const cardLayer = pgTable(
  "card_layer",
  {
    cardId: uuid("card_id")
      .notNull()
      .references(() => card.id, { onDelete: "cascade" }),
    layerId: uuid("layer_id")
      .notNull()
      .references(() => layer.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.cardId, table.layerId] })]
);

// ─────────────────────────────────────────────────────────────────────────────
// User-Layer Junction Table
// ─────────────────────────────────────────────────────────────────────────────

export const userLayer = pgTable(
  "user_layer",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    layerId: uuid("layer_id")
      .notNull()
      .references(() => layer.id, { onDelete: "cascade" }),
    role: layerRoleEnum("role").notNull().default("guest"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.layerId] })]
);

// ─────────────────────────────────────────────────────────────────────────────
// Inferred Types
// ─────────────────────────────────────────────────────────────────────────────

export type Card = typeof card.$inferSelect;
export type Layer = typeof layer.$inferSelect;
export type CardLayer = typeof cardLayer.$inferSelect;
export type UserLayer = typeof userLayer.$inferSelect;
export type LayerRole = UserLayer["role"];
