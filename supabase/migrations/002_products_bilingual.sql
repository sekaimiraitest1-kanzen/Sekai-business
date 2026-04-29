-- BUG-1 fix: products table needs SR + LAT name and description variants.
-- Until now `products` had a single `name` / `description`, so any Cyrillic
-- entry leaked into LAT mode (and vice versa).
--
-- Strategy:
--   1. Add four new columns: name_sr, name_lat, description_sr, description_lat
--   2. Backfill from the existing single-script columns. We don't know which
--      script the admin used, so we copy the same value to BOTH variants —
--      Triša will translate at her own pace via the admin editor.
--   3. Keep `name` / `description` for back-compat for any external integration
--      that still reads them. They're no longer the source of truth on the
--      public site after this migration.
--   4. Also canonicalize brand to Latin (BUG-2) — international convention,
--      brands rarely translated. "ТРИША" → "TRIŠA".

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS name_sr text,
  ADD COLUMN IF NOT EXISTS name_lat text,
  ADD COLUMN IF NOT EXISTS description_sr text,
  ADD COLUMN IF NOT EXISTS description_lat text;

-- Backfill: copy current single-script values to both variants where empty.
UPDATE products
   SET name_sr = COALESCE(name_sr, name),
       name_lat = COALESCE(name_lat, name),
       description_sr = COALESCE(description_sr, description),
       description_lat = COALESCE(description_lat, description)
 WHERE name_sr IS NULL OR name_lat IS NULL
    OR description_sr IS NULL OR description_lat IS NULL;

-- Make name_sr / name_lat NOT NULL so admin form must fill both going forward.
-- (description_* stays nullable since description is optional in the editor.)
ALTER TABLE products
  ALTER COLUMN name_sr SET NOT NULL,
  ALTER COLUMN name_lat SET NOT NULL;

-- BUG-2: canonicalize brand to Latin. Triša products had inconsistent entries.
UPDATE products SET brand = 'TRIŠA' WHERE brand = 'ТРИША';

-- BUG-11: ensure SR category names are actually in Cyrillic where business
-- expectation is Cyrillic. Aftershave + Shampoo were left in Latin.
-- Stefan/Triša can override these with their preferred Cyrillic equivalents
-- via /admin/shop/kategorije; defaults below are best-guess.
UPDATE product_categories SET name_sr = 'АФТЕРШЕЈВ' WHERE slug = 'aftershave' AND name_sr = 'AFTERSHAVE';
UPDATE product_categories SET name_sr = 'ШАМПОН'    WHERE slug = 'shampoo'    AND name_sr = 'SHAMPOO';

-- Verification queries (run after migration to confirm):
--   SELECT id, name, name_sr, name_lat FROM products LIMIT 20;
--   SELECT brand, count(*) FROM products GROUP BY brand;
--   SELECT slug, name_sr, name_lat FROM product_categories;
