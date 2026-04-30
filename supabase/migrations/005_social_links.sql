-- 005_social_links.sql
-- Add a JSONB column on `salons` for admin-managed social media presence.
-- Shape per row:
--   {
--     "instagram": { "enabled": false, "url": "" },
--     "facebook":  { "enabled": false, "url": "" },
--     "tiktok":    { "enabled": false, "url": "" },
--     "linkedin":  { "enabled": false, "url": "" },
--     "x":         { "enabled": false, "url": "" }
--   }
-- The footer renders an icon ONLY when (enabled = true AND url != "").
-- This lets the admin toggle visibility independently from URL ownership —
-- the client can pre-fill URLs ahead of go-live and flip enabled later, or
-- launch with everything off and add platforms one by one.

ALTER TABLE salons
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT
    '{
      "instagram": { "enabled": false, "url": "" },
      "facebook":  { "enabled": false, "url": "" },
      "tiktok":    { "enabled": false, "url": "" },
      "linkedin":  { "enabled": false, "url": "" },
      "x":         { "enabled": false, "url": "" }
    }'::jsonb;

-- Backfill existing rows so partial old payloads (e.g. only some platforms)
-- get all five keys. Idempotent — re-running is safe.
UPDATE salons
SET social_links = jsonb_build_object(
  'instagram', COALESCE(social_links -> 'instagram', '{"enabled": false, "url": ""}'::jsonb),
  'facebook',  COALESCE(social_links -> 'facebook',  '{"enabled": false, "url": ""}'::jsonb),
  'tiktok',    COALESCE(social_links -> 'tiktok',    '{"enabled": false, "url": ""}'::jsonb),
  'linkedin',  COALESCE(social_links -> 'linkedin',  '{"enabled": false, "url": ""}'::jsonb),
  'x',         COALESCE(social_links -> 'x',         '{"enabled": false, "url": ""}'::jsonb)
);
