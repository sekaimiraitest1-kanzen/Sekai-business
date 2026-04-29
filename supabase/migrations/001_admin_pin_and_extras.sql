-- Migration 001: PIN rate limiting + categories + announcements + blocked slots + storage buckets
-- Idempotent — safe to re-run.

-- ─── 1. PIN rate limiting on admin_users ─────────────
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS failed_pin_attempts INTEGER DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_pin_attempt_at TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- ─── 2. Product categories table ─────────────────────
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name_sr TEXT NOT NULL,
  name_lat TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salon_id, slug)
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories public read" ON product_categories;
CREATE POLICY "categories public read" ON product_categories
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "categories admin write" ON product_categories;
CREATE POLICY "categories admin write" ON product_categories
  USING (is_admin_of(salon_id));

-- Seed defaults from existing product categories (idempotent)
INSERT INTO product_categories (salon_id, slug, name_sr, name_lat, sort_order)
SELECT
  '00000000-0000-0000-0000-00000000aaaa'::uuid,
  cat,
  CASE cat
    WHEN 'pomade' THEN 'Помаде'
    WHEN 'beard' THEN 'Брада'
    WHEN 'shave' THEN 'Бријање'
    WHEN 'tools' THEN 'Алат'
    WHEN 'hair' THEN 'Коса'
    ELSE INITCAP(cat)
  END,
  CASE cat
    WHEN 'pomade' THEN 'Pomade'
    WHEN 'beard' THEN 'Brada'
    WHEN 'shave' THEN 'Brijanje'
    WHEN 'tools' THEN 'Alat'
    WHEN 'hair' THEN 'Kosa'
    ELSE INITCAP(cat)
  END,
  ROW_NUMBER() OVER (ORDER BY cat)
FROM (SELECT DISTINCT category AS cat FROM products WHERE category IS NOT NULL) c
ON CONFLICT (salon_id, slug) DO NOTHING;

-- ─── 3. Site announcements / banners ─────────────────
CREATE TABLE IF NOT EXISTS site_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  title_sr TEXT,
  title_lat TEXT,
  body_sr TEXT,
  body_lat TEXT,
  active BOOLEAN DEFAULT FALSE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements public read active" ON site_announcements;
CREATE POLICY "announcements public read active" ON site_announcements
  FOR SELECT USING (
    active = true
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at >= NOW())
  );

DROP POLICY IF EXISTS "announcements admin write" ON site_announcements;
CREATE POLICY "announcements admin write" ON site_announcements
  USING (is_admin_of(salon_id));

-- ─── 4. Blocked slots (lunch breaks, vacations) ──────
CREATE TABLE IF NOT EXISTS blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TIME,                       -- NULL = whole day
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_salon_date ON blocked_slots (salon_id, date);

ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_slots public read" ON blocked_slots;
CREATE POLICY "blocked_slots public read" ON blocked_slots
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "blocked_slots admin write" ON blocked_slots;
CREATE POLICY "blocked_slots admin write" ON blocked_slots
  USING (is_admin_of(salon_id));

-- ─── 5. Customer notes (private, admin-only) ─────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_visit_date DATE;

-- ─── 6. Storage buckets (created via Supabase Storage API in app, not SQL)
--   Buckets: gallery (public read), products (public read), avatars (private)
--   See web/scripts/init-storage.ts to create them at deploy time.
