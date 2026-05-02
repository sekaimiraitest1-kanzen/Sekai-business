-- Migration 008: soft-delete on customers
-- Idempotent — safe to re-run.
--
-- Triša needs the ability to remove customers from the active list (privacy
-- requests, mistaken duplicates, blocklist). We use soft-delete instead of
-- hard-delete so historical bookings keep their customer_id reference and
-- statistics (revenue, repeat-customer counts) stay intact across the
-- delete. The list / lookup paths filter `deleted_at IS NULL`; the FK
-- behaviour is unchanged.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial index so the salon-wide phone lookup (used by both public
-- booking and walk-in) stays a single index hit even with soft-deleted
-- rows in the table.
CREATE INDEX IF NOT EXISTS customers_active_phone_idx
  ON customers (salon_id, phone)
  WHERE deleted_at IS NULL;
