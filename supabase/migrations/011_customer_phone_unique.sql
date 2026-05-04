-- 011 — collapse the same human into one customer row regardless of phone
-- formatting. Pre-fix, "0603300036" (booking flow) and "+381603300036"
-- (shop checkout) created two rows for the same person, breaking loyalty
-- and spend aggregation.
--
-- Three layers, defense-in-depth:
--   1. normalize_phone(): canonical national-format helper, mirrors
--      web/src/lib/phone.ts.
--   2. BEFORE INSERT/UPDATE trigger on customers: guarantees the column
--      is canonical even if a future code path forgets to normalize.
--   3. UNIQUE partial index on (salon_id, phone) WHERE deleted_at IS NULL:
--      hard-stop against concurrent inserts racing past the app-level
--      lookup.

CREATE OR REPLACE FUNCTION normalize_phone(raw text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  cleaned text;
  no_plus text;
BEGIN
  IF raw IS NULL OR raw = '' THEN RETURN ''; END IF;
  cleaned := regexp_replace(raw, '[\s\-().]', '', 'g');
  cleaned := trim(cleaned);
  IF left(cleaned, 1) = '+' THEN
    no_plus := substring(cleaned from 2);
  ELSE
    no_plus := cleaned;
  END IF;
  IF no_plus !~ '^[0-9]+$' THEN RETURN cleaned; END IF;
  IF left(no_plus, 3) = '381' THEN
    RETURN '0' || substring(no_plus from 4);
  END IF;
  IF left(no_plus, 1) = '0' THEN RETURN no_plus; END IF;
  IF length(no_plus) BETWEEN 8 AND 10 THEN
    RETURN '0' || no_plus;
  END IF;
  RETURN no_plus;
END;
$$;

-- An older non-partial UNIQUE (salon_id, phone) on customers covered
-- soft-deleted rows too, which (a) blocked Triša from re-adding a
-- previously-deleted customer with the same phone, and (b) would block
-- the canonical-phone backfill below if any soft-deleted dupes exist.
-- Drop it; the partial index added at the end of this migration is the
-- correct constraint.
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_salon_id_phone_key;

-- Backfill: rewrite every existing phone to canonical form. Safe even on
-- soft-deleted rows (and in fact necessary so a future re-activation
-- doesn't slip past the unique index with a non-canonical value).
UPDATE customers SET phone = normalize_phone(phone) WHERE phone IS NOT NULL;

CREATE OR REPLACE FUNCTION customers_normalize_phone() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := normalize_phone(NEW.phone);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_normalize_phone_trg ON customers;
CREATE TRIGGER customers_normalize_phone_trg
  BEFORE INSERT OR UPDATE OF phone ON customers
  FOR EACH ROW EXECUTE FUNCTION customers_normalize_phone();

-- Active rows must be unique per phone within a salon. Soft-deleted rows
-- are excluded so Triša's "delete + re-add" workflow still works.
CREATE UNIQUE INDEX IF NOT EXISTS customers_salon_phone_active_uniq
  ON customers (salon_id, phone)
  WHERE deleted_at IS NULL;
