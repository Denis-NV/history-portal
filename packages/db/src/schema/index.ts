// ─────────────────────────────────────────────────────────────────────────────
// Database Schema
// ─────────────────────────────────────────────────────────────────────────────
// This file exports all database table schemas.
//
// Tables:
// - auth.ts: Better Auth tables (user, session, account, verification)
//
// Example table definition:
//
// import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
//
// export const posts = pgTable('posts', {
//   id: uuid('id').primaryKey().defaultRandom(),
//   title: text('title').notNull(),
//   content: text('content'),
//   createdAt: timestamp('created_at').defaultNow().notNull(),
//   updatedAt: timestamp('updated_at').defaultNow().notNull(),
// });
// ─────────────────────────────────────────────────────────────────────────────

// Auth schema (Better Auth)
export * from "./auth";

// Cards schema
export * from "./cards";
