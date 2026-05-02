/**
 * Customer-facing cancellation tokens for booking confirmation emails.
 *
 * Tokens are deterministic HMACs of the booking ID + a fixed namespace,
 * keyed by SUPABASE_SERVICE_ROLE_KEY. We don't store the token in the DB —
 * it's recomputed on demand. That keeps the migration footprint to zero
 * and makes idempotent re-issue trivial (the same booking always produces
 * the same token).
 *
 * 32 hex chars = 128-bit security, more than enough for a per-booking
 * cancel link that's only useful for ~24h around the slot.
 *
 * Constant-time comparison defends against timing-side-channel attacks if
 * an attacker tries to brute force the token byte by byte.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const NAMESPACE = "cancel-v1";
const TOKEN_LEN = 32;

function getSecret(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("SUPABASE_SERVICE_ROLE_KEY required for cancel token");
  return k;
}

export function bookingCancelToken(bookingId: string): string {
  return createHmac("sha256", getSecret())
    .update(`${NAMESPACE}:${bookingId}`)
    .digest("hex")
    .slice(0, TOKEN_LEN);
}

export function verifyBookingCancelToken(bookingId: string, token: string): boolean {
  if (!token || token.length !== TOKEN_LEN) return false;
  const expected = bookingCancelToken(bookingId);
  // Both buffers must have the same length for timingSafeEqual; we already
  // checked length above so this is safe.
  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(token, "utf8"));
  } catch {
    return false;
  }
}
