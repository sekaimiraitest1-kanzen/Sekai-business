-- 006_error_log.sql
-- Lightweight error capture in Supabase. Replaces a Sentry/external dep with
-- a single in-DB table; admin can view recent errors via /admin (a future
-- /admin/errors view, V1.1) and use the data to triage.
--
-- Why not Sentry: Free tier philosophy + we already have Supabase + the
-- volume for a single-location barbershop will be tiny. Migration to Sentry
-- is straightforward later if needed.

CREATE TABLE IF NOT EXISTS error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Error message (the .message of the caught Error, capped via app code)
  message TEXT NOT NULL,
  -- Full stack as captured. Optional — server errors have it, client can
  -- pass error.digest from Next.js error boundaries.
  stack TEXT,
  -- Source URL the user was on when the error occurred (so we can repro)
  url TEXT,
  -- 'server' | 'client' | 'global' — which boundary fired
  surface TEXT NOT NULL CHECK (surface IN ('server', 'client', 'global')),
  -- User agent if available (client-side)
  user_agent TEXT,
  -- Next.js error digest — useful for cross-referencing Vercel logs
  digest TEXT
);

CREATE INDEX IF NOT EXISTS error_log_occurred_at_idx
  ON error_log (occurred_at DESC);

CREATE INDEX IF NOT EXISTS error_log_surface_idx
  ON error_log (surface, occurred_at DESC);

ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;

-- INSERT is anon-allowed (so client error boundaries can write without auth)
-- but READ is admin-only (errors may contain sensitive data — URLs with
-- query params, stack traces with code paths).
DROP POLICY IF EXISTS "error_log insert anon" ON error_log;
CREATE POLICY "error_log insert anon"
  ON error_log FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "error_log read admin" ON error_log;
CREATE POLICY "error_log read admin"
  ON error_log FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM admin_users a
      WHERE a.user_id = auth.uid()
    )
  );

-- Auto-purge errors older than 30 days to keep Free tier DB size bounded.
-- Schedule via Supabase Cron (or accept that admin will manually delete) —
-- for now the table is small enough that 30-day retention isn't critical.
-- Add the cron job in Supabase dashboard:
--   SELECT cron.schedule('purge-error-log', '0 4 * * *',
--     $$DELETE FROM error_log WHERE occurred_at < now() - interval '30 days'$$);
