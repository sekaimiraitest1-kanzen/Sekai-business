-- Migration 014: barber public profiles + booking-by-barber
-- Idempotent — safe to re-run.
--
-- Reuses admin_users (the existing staff/login table) for barber public
-- profiles instead of a parallel table: bookings.staff_id already FKs here
-- for post-hoc admin attribution, so "the barber a customer picks" and
-- "the person who did the cut" stay the same identity by construction.
-- Only rows with show_on_site=true are ever exposed publicly, via the
-- public_barbers view below — admin_users itself keeps its existing
-- restrictive RLS (it holds pin_hash + email).

-- ─── 1. Public profile columns ──────────────────────────────────────────
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS bio_sr TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS bio_lat TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS specialty_sr TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS specialty_lat TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role_title_sr TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role_title_lat TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS show_on_site BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS public_sort_order INTEGER NOT NULL DEFAULT 0;

-- ─── 2. Public-safe view ─────────────────────────────────────────────────
-- Views default to running as their OWNER (ownership chaining), not the
-- querying role — this is what lets an anon-granted view read through a
-- table whose RLS would otherwise block anon entirely. We rely on that
-- default explicitly here. Only ever add SAFE columns to this SELECT list —
-- never pin_hash, email, phone, first_name/last_name, failed_pin_attempts.
CREATE OR REPLACE VIEW public_barbers WITH (security_invoker = false) AS
  SELECT
    id,
    salon_id,
    display_name,
    photo_url,
    bio_sr,
    bio_lat,
    specialty_sr,
    specialty_lat,
    role_title_sr,
    role_title_lat,
    public_sort_order
  FROM admin_users
  WHERE show_on_site = true
    AND is_active = true
    AND deleted_at IS NULL;

GRANT SELECT ON public_barbers TO anon, authenticated;

-- ─── 3. Booking → barber selection (set by the customer at booking time) ─
-- Distinct from staff_id (migration 007), which is set LATER when an admin
-- claims the booking with a DONE stamp for earnings attribution — the two
-- can legitimately differ (e.g. Marko is out sick, Vuk covers his booking:
-- barber_id stays Marko, staff_id becomes Vuk).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS barber_id UUID
  REFERENCES admin_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_barber_idx ON bookings(salon_id, barber_id, date);
