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
-- Helper function to check user's role for a layer
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION user_layer_role(layer_id uuid)
RETURNS layer_role AS $$
DECLARE
  role_value layer_role;
BEGIN
  SELECT role INTO role_value
  FROM user_layer
  WHERE user_layer.layer_id = $1
    AND user_layer.user_id = current_app_user_id();
  RETURN role_value;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Layer Table RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────
-- Access is controlled via the user_layer junction table.
-- - SELECT: any role (owner, editor, guest)
-- - UPDATE: editor or owner role
-- - DELETE: owner role only
-- - INSERT: anyone can create a layer (they become owner via user_layer)

ALTER TABLE layer ENABLE ROW LEVEL SECURITY;
ALTER TABLE layer FORCE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view layers they have access to" ON layer;
DROP POLICY IF EXISTS "Users can insert layers" ON layer;
DROP POLICY IF EXISTS "Editors and owners can update layers" ON layer;
DROP POLICY IF EXISTS "Owners can delete layers" ON layer;

-- SELECT: Users can view layers they have any role for (or admins see all)
CREATE POLICY "Users can view layers they have access to"
  ON layer
  FOR SELECT
  USING (
    user_layer_role(id) IS NOT NULL
    OR is_app_admin()
  );

-- INSERT: Anyone can create a layer (must add user_layer entry separately)
CREATE POLICY "Users can insert layers"
  ON layer
  FOR INSERT
  WITH CHECK (current_app_user_id() IS NOT NULL);

-- UPDATE: Only editors and owners can update layers
CREATE POLICY "Editors and owners can update layers"
  ON layer
  FOR UPDATE
  USING (
    user_layer_role(id) IN ('owner', 'editor')
    OR is_app_admin()
  )
  WITH CHECK (
    user_layer_role(id) IN ('owner', 'editor')
    OR is_app_admin()
  );

-- DELETE: Only owners can delete layers
CREATE POLICY "Owners can delete layers"
  ON layer
  FOR DELETE
  USING (
    user_layer_role(id) = 'owner'
    OR is_app_admin()
  );
