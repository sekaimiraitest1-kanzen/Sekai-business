/**
 * Normalize a Serbian phone number to E.164 (+381…) for `tel:` hrefs and
 * schema.org `telephone` fields. Visual display text stays untouched —
 * components render the original DB value, only the `href` uses E.164.
 *
 * Handles inputs like:
 *   "065 9003 742"  → "+381659003742"
 *   "0659003742"    → "+381659003742"
 *   "381659003742"  → "+381659003742"
 *   "+381659003742" → "+381659003742"
 *
 * Returns the original string unchanged if it doesn't match a known shape —
 * `tel:` is forgiving, mobile dialers will still parse most formats.
 */
export function formatPhoneE164(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) return "+381" + digits.slice(1);
  if (digits.startsWith("381")) return "+" + digits;
  if (input.trim().startsWith("+")) return input.trim();
  return input;
}

/**
 * Canonical national-format key for customer dedup.
 *
 * Real-world Triša data already had the same person under both
 * "0603300036" (booking flow) and "+381603300036" (shop checkout) —
 * both flows ran `eq("phone", x)` against raw user input, so the
 * formatting difference produced two customer rows for one human.
 *
 * Strategy: produce a single canonical national-format string per
 * phone so equality checks collapse the same person. Used at every
 * customer-write site (booking, shop, admin walk-in) plus the matching
 * DB-side normalization in supabase/migrations/011.
 *
 *   "+381603300036"   →  "0603300036"
 *   " 0603 300 036 "  →  "0603300036"
 *   "(060) 599-7257"  →  "0605997257"
 *   "603300036"       →  "0603300036"   (8-10 digit bare → 0-prefix)
 *
 * For non-Serbian numbers (no 381 prefix, doesn't start with 0) the
 * helper returns the digits-only form so foreign visitors still get a
 * stable canonical key.
 */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const cleaned = raw.replace(/[\s\-().]/g, "").trim();
  const noPlus = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  if (!/^\d+$/.test(noPlus)) return cleaned;
  if (noPlus.startsWith("381")) return "0" + noPlus.slice(3);
  if (noPlus.startsWith("0")) return noPlus;
  if (noPlus.length >= 8 && noPlus.length <= 10) return "0" + noPlus;
  return noPlus;
}
