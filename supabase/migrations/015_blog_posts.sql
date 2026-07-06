-- Migration 015: blog posts
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title_sr TEXT NOT NULL,
  title_lat TEXT NOT NULL,
  excerpt_sr TEXT,
  excerpt_lat TEXT,
  body_sr TEXT NOT NULL DEFAULT '',
  body_lat TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salon_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_salon_published ON blog_posts (salon_id, published, published_at DESC);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_posts public read published" ON blog_posts;
CREATE POLICY "blog_posts public read published" ON blog_posts
  FOR SELECT USING (
    published = true
    AND (published_at IS NULL OR published_at <= NOW())
  );

DROP POLICY IF EXISTS "blog_posts admin write" ON blog_posts;
CREATE POLICY "blog_posts admin write" ON blog_posts
  USING (is_admin_of(salon_id));
