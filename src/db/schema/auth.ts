// ─────────────────────────────────────────────────────────────────────────────
// Auth Schema (Better Auth)
// ─────────────────────────────────────────────────────────────────────────────
// This file defines the authentication tables required by Better Auth.
// Generated using Better Auth's Drizzle adapter with custom role field.
//
// Tables:
// - user: User accounts with profile information and role
// - session: Active sessions for authenticated users
// - account: OAuth provider accounts linked to users
// - verification: Email verification and password reset tokens
//
// See: https://www.better-auth.com/docs/concepts/database
// ─────────────────────────────────────────────────────────────────────────────

import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// User Table
// ─────────────────────────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"), // "user" | "admin"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Session Table
// ─────────────────────────────────────────────────────────────────────────────

export const session = pgTable("session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Account Table (OAuth Providers)
// ─────────────────────────────────────────────────────────────────────────────

export const account = pgTable("account", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Verification Table (Email Verification & Password Reset)
// ─────────────────────────────────────────────────────────────────────────────

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

// Role type for type-safe role checks
export type UserRole = "user" | "admin";
