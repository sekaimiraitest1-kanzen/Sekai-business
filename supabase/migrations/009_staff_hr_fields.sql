-- Migration 009: HR fields + soft-delete on admin_users
-- Idempotent — safe to re-run.
--
-- Triša needs an "ex-employee archive" so she can see who worked at the
-- shop, with phone / email / full name / lifetime customer count, even
-- after they leave. We add the missing fields (phone, first_name,
-- last_name) so the archive is meaningful, plus deleted_at for the
-- soft-delete itself. is_active stays as a separate concept (temporary
-- pause vs permanent removal):
--
--   is_active=TRUE,  deleted_at=NULL   → active employee
--   is_active=FALSE, deleted_at=NULL   → paused (vacation, leave)
--   is_active=*,     deleted_at!=NULL  → archived ex-employee
--
-- All login + RLS paths skip deleted rows. Past bookings keep their
-- staff_id reference so the archived row can render an accurate
-- "lifetime customers served" count for HR.

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Backfill: best-effort split of existing display_name into first/last so
-- the HR archive is populated for any pre-existing rows. "Triša" → first
-- = "Triša", last = NULL. "Marko Marković" → first = "Marko", last =
-- "Marković". Skips rows that already have first_name set.
UPDATE admin_users
SET first_name = COALESCE(NULLIF(SPLIT_PART(display_name, ' ', 1), ''), display_name),
    last_name  = NULLIF(SUBSTR(display_name, LENGTH(SPLIT_PART(display_name, ' ', 1)) + 2), '')
WHERE display_name IS NOT NULL AND first_name IS NULL;

-- is_admin_of() also excludes soft-deleted rows. Keep the existing param
-- name `p_salon` so 17 dependent RLS policies survive the OR REPLACE.
CREATE OR REPLACE FUNCTION is_admin_of(p_salon UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
      AND salon_id = p_salon
      AND COALESCE(is_active, TRUE) = TRUE
      AND deleted_at IS NULL
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
