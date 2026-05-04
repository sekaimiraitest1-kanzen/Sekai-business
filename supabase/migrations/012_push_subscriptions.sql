-- 012 — store Web Push subscriptions per admin device so the server can
-- send native PWA notifications when a new booking lands. One admin user
-- may install the PWA on multiple devices (phone + tablet); each device
-- gets its own row. Stale endpoints (browser cleared site data, user
-- revoked permission) are pruned by the sender on 404/410 responses.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One subscription per (admin, endpoint) — re-subscribing replaces the
-- existing keys instead of creating a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_admin_endpoint_uniq
  ON push_subscriptions (admin_user_id, endpoint);

CREATE INDEX IF NOT EXISTS push_subscriptions_salon_idx
  ON push_subscriptions (salon_id);
