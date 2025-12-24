-- ─────────────────────────────────────────────────────────────────────────────
-- RLS (Row Level Security) Setup
-- ─────────────────────────────────────────────────────────────────────────────
-- This migration enables RLS and creates policies for user data isolation.
-- This script is IDEMPOTENT - safe to run multiple times.
--
-- The app sets these session variables before each query:
--   SET LOCAL app.user_id = '<user-uuid>';
--   SET LOCAL app.is_admin = 'true';  -- (optional, for admin bypass)
--
-- Run via: pnpm --filter @history-portal/db migrate:rls
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- Application Role for RLS
-- ─────────────────────────────────────────────────────────────────────────────
-- The neondb_owner role has BYPASSRLS, so we need a separate role for RLS.
-- This role is used via SET ROLE within transactions.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END $$;

-- Grant necessary permissions to app_user
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Ensure future tables also get these grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- Allow neondb_owner to switch to app_user role
GRANT app_user TO neondb_owner;
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function to get current user ID from session
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.user_id', true), '')::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function to check if current session is admin
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(current_setting('app.is_admin', true), 'false') = 'true';
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Card Table RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────
-- TODO: Add RLS policies for card table
-- Cards are private to their owner (user_id field)
-- ─────────────────────────────────────────────────────────────────────────────
