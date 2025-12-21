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

-- ─────────────────────────────────────────────────────────────────────────────
-- Card Table RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────
-- Cards are accessed through layers via the card_layer junction table.
-- A user can access a card if they have access to ANY layer the card belongs to.

ALTER TABLE card ENABLE ROW LEVEL SECURITY;
ALTER TABLE card FORCE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view cards in their layers" ON card;
DROP POLICY IF EXISTS "Users can insert cards" ON card;
DROP POLICY IF EXISTS "Editors and owners can update cards" ON card;
DROP POLICY IF EXISTS "Owners can delete cards" ON card;

-- Helper function to check if user has access to a card via any layer
CREATE OR REPLACE FUNCTION user_has_card_access(card_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM card_layer cl
    WHERE cl.card_id = $1
      AND user_layer_role(cl.layer_id) IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to check if user can edit a card (editor/owner on any linked layer)
CREATE OR REPLACE FUNCTION user_can_edit_card(card_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM card_layer cl
    WHERE cl.card_id = $1
      AND user_layer_role(cl.layer_id) IN ('owner', 'editor')
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- SELECT: Users can view cards if they have access to any linked layer
CREATE POLICY "Users can view cards in their layers"
  ON card
  FOR SELECT
  USING (
    user_has_card_access(id)
    OR is_app_admin()
  );

-- INSERT: Anyone authenticated can create cards (must link to a layer separately)
CREATE POLICY "Users can insert cards"
  ON card
  FOR INSERT
  WITH CHECK (current_app_user_id() IS NOT NULL);

-- UPDATE: Users with editor/owner role on any linked layer can update
CREATE POLICY "Editors and owners can update cards"
  ON card
  FOR UPDATE
  USING (
    user_can_edit_card(id)
    OR is_app_admin()
  )
  WITH CHECK (
    user_can_edit_card(id)
    OR is_app_admin()
  );

-- DELETE: Users with owner role on any linked layer can delete
CREATE POLICY "Owners can delete cards"
  ON card
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM card_layer cl
      WHERE cl.card_id = id
        AND user_layer_role(cl.layer_id) = 'owner'
    )
    OR is_app_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Card-Layer Junction Table RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────
-- Controls linking/unlinking cards to layers.

ALTER TABLE card_layer ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_layer FORCE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view card-layer links for their layers" ON card_layer;
DROP POLICY IF EXISTS "Editors can manage card-layer links" ON card_layer;

-- SELECT: Users can see card-layer links for layers they have access to
CREATE POLICY "Users can view card-layer links for their layers"
  ON card_layer
  FOR SELECT
  USING (
    user_layer_role(layer_id) IS NOT NULL
    OR is_app_admin()
  );

-- INSERT/UPDATE/DELETE: Editors and owners can manage card-layer links
CREATE POLICY "Editors can manage card-layer links"
  ON card_layer
  FOR ALL
  USING (
    user_layer_role(layer_id) IN ('owner', 'editor')
    OR is_app_admin()
  )
  WITH CHECK (
    user_layer_role(layer_id) IN ('owner', 'editor')
    OR is_app_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- User-Layer Junction Table RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────
-- Controls who can see and manage layer memberships.

ALTER TABLE user_layer ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_layer FORCE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own layer memberships" ON user_layer;
DROP POLICY IF EXISTS "Owners can manage layer memberships" ON user_layer;

-- SELECT: Users can see their own memberships + owners can see all for their layers
CREATE POLICY "Users can view their own layer memberships"
  ON user_layer
  FOR SELECT
  USING (
    user_id = current_app_user_id()
    OR user_layer_role(layer_id) = 'owner'
    OR is_app_admin()
  );

-- INSERT/UPDATE/DELETE: Only owners can manage layer memberships
CREATE POLICY "Owners can manage layer memberships"
  ON user_layer
  FOR ALL
  USING (
    user_layer_role(layer_id) = 'owner'
    OR is_app_admin()
  )
  WITH CHECK (
    user_layer_role(layer_id) = 'owner'
    OR is_app_admin()
  );
