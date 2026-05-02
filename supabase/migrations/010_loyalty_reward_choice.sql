-- Migration 010: loyalty redeem — split into "free cut" vs "shop 20% off"
-- Idempotent — safe to re-run.
--
-- Pre-existing loyalty system: 6 completed visits → 1 redeem event resets
-- the counter. Triša manually didn't charge the 6th cut. We extend that:
-- when the customer earns the reward, Triša chooses one of two options
-- and the next applicable transaction auto-applies it.
--
-- A pending reward is per-customer (only one at a time). The booking
-- (free_cut) or order (shop_20) marks itself as the redeemer and clears
-- the flag on insert, so the customer can't double-spend by chaining a
-- free booking + a shop discount on the same redemption.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_pending_reward TEXT
  CHECK (loyalty_pending_reward IS NULL OR loyalty_pending_reward IN ('free_cut', 'shop_20'));

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_loyalty_redeem BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_loyalty_discount BOOLEAN NOT NULL DEFAULT FALSE;
