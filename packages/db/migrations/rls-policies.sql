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
-- Example: RLS policy for a user-owned table
-- ─────────────────────────────────────────────────────────────────────────────
-- Copy and adapt this template for your tables that have a user_id column:
--
-- ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE your_table FORCE ROW LEVEL SECURITY;
--
-- -- Users can only see their own rows (or admins see all)
-- CREATE POLICY "Users can view own data"
--   ON your_table
--   FOR SELECT
--   USING (user_id = current_app_user_id() OR is_app_admin());
--
-- -- Users can only insert rows for themselves
-- CREATE POLICY "Users can insert own data"
--   ON your_table
--   FOR INSERT
--   WITH CHECK (user_id = current_app_user_id());
--
-- -- Users can only update their own rows
-- CREATE POLICY "Users can update own data"
--   ON your_table
--   FOR UPDATE
--   USING (user_id = current_app_user_id() OR is_app_admin())
--   WITH CHECK (user_id = current_app_user_id());
--
-- -- Users can only delete their own rows (or admins can delete any)
-- CREATE POLICY "Users can delete own data"
--   ON your_table
--   FOR DELETE
--   USING (user_id = current_app_user_id() OR is_app_admin());
