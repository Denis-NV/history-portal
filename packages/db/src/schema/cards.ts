// ─────────────────────────────────────────────────────────────────────────────
// Cards Schema
// ─────────────────────────────────────────────────────────────────────────────
// This file defines the card table for historical events.
//
// Tables:
// - card: Historical event cards with dates supporting BCE (negative years)
//
// Date handling:
// - Years are stored as integers (negative for BCE, e.g., -4000 for 4000 BCE)
// - Month and day are optional for partial date precision
// ─────────────────────────────────────────────────────────────────────────────

import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// ─────────────────────────────────────────────────────────────────────────────
// Card Table
// ─────────────────────────────────────────────────────────────────────────────

export const card = pgTable("card", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
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
// Inferred Types
// ─────────────────────────────────────────────────────────────────────────────

export type Card = typeof card.$inferSelect;
