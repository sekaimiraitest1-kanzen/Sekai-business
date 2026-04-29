-- Service "Premium / Featured" support — replaces the page.tsx /vip/i.test() magic-string hack.
-- Admin /admin/usluge editor will expose:
--   - "FEATURED" toggle (yes → service spans both columns + mustard accent + description)
--   - Description SR / LAT (textarea, shown only when featured)
--   - Meta tag SR / LAT override (optional; default stays "{duration_min} MIN")
-- Multiple featured services are supported (each renders full-width on its own row).

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS description_sr TEXT,
  ADD COLUMN IF NOT EXISTS description_lat TEXT,
  ADD COLUMN IF NOT EXISTS meta_sr TEXT,
  ADD COLUMN IF NOT EXISTS meta_lat TEXT;
