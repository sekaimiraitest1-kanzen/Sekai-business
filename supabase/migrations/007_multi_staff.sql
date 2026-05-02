-- Migration 007: multi-staff support
-- Idempotent — safe to re-run.
--
-- Adds the ability for the owner (Triša) to create employee accounts that
-- share the salon's admin surface but with limited permissions:
--   * staff sees own + unassigned bookings (claim-by-DONE-stamp model)
--   * staff statistics scoped to bookings they personally completed
--   * staff cannot edit services, gallery, settings, products, blocks
-- The schema change is purely additive — pre-existing rows continue to
-- behave as before (role='admin', staff_id=NULL on bookings, salon-level
-- rate-limit columns default to 0/NULL).

-- ─── 1. Role expansion ──────────────────────────────────────────────────
-- The role column is TEXT (no enum). Replace any existing CHECK constraint
-- with one that allows 'staff'.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_role_check') THEN
    ALTER TABLE admin_users DROP CONSTRAINT admin_users_role_check;
  END IF;
  ALTER TABLE admin_users
    ADD CONSTRAINT admin_users_role_check
    CHECK (role IN ('admin', 'superadmin', 'staff'));
END $$;

-- ─── 2. Display name + active flag ──────────────────────────────────────
-- display_name is what the UI shows (e.g. "Triša", "Marko"). Distinct from
-- email so staff don't need real email addresses provisioned.
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill display_name for the owner row(s) so the UI has something to
-- render before Triša edits it from settings.
UPDATE admin_users
SET display_name = 'Triša'
WHERE display_name IS NULL AND role IN ('admin', 'superadmin');

-- ─── 3. Booking → staff assignment ──────────────────────────────────────
-- Nullable: NULL means "unclaimed, both Triša and staff see it". Stamped on
-- DONE click by the user who completed the cut. Earnings credit follows
-- staff_id on rows where status='done'.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_id UUID
  REFERENCES admin_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_staff_idx ON bookings(salon_id, staff_id, date);

-- ─── 4. Salon-level PIN rate limiter ────────────────────────────────────
-- The pre-multi-staff lockout sat on admin_users.failed_pin_attempts. With
-- multiple users we can't attribute a wrong PIN to any specific user before
-- we know who they are, so the rate limit moves to the salon level. The
-- existing per-user counter stays in the schema (legacy) but is no longer
-- written to by the login flow.
ALTER TABLE salons ADD COLUMN IF NOT EXISTS pin_failed_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;

-- ─── 5. is_admin_of() respects is_active ────────────────────────────────
-- A staff member toggled inactive must immediately lose RLS-level access;
-- the function is the gate every policy goes through. We keep the existing
-- parameter name `p_salon` (cannot change it via OR REPLACE — would require
-- DROP CASCADE that wipes 17 dependent policies). Only the body changes.
CREATE OR REPLACE FUNCTION is_admin_of(p_salon UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
      AND salon_id = p_salon
      AND COALESCE(is_active, TRUE) = TRUE
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
