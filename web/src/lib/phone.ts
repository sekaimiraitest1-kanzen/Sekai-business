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
