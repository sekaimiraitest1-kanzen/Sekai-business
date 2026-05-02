"use server";

import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSession, setSessionCookie, clearSessionCookie, type AdminRole } from "./admin-session";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

type UnlockResult =
  | { ok: true }
  | { ok: false; error: "INVALID_PIN" | "LOCKED_OUT" | "NO_ADMIN" | "INTERNAL"; lockoutUntil?: string; remaining?: number };

/**
 * PIN login for any admin (owner or staff). With multi-staff the PIN itself
 * doesn't tell us which user is logging in, so we iterate over every active
 * admin row in the salon and run bcrypt.compare against each. First match
 * wins.
 *
 * Rate limiting moves from per-user to per-salon: when no row matches, we
 * can't attribute the wrong attempt to a user, so we increment a salon-wide
 * counter (`salons.pin_failed_attempts`). 5 failed attempts → 10-minute
 * salon-wide lockout, applied uniformly to every PIN attempt during that
 * window.
 */
export async function unlockAdmin(pin: string): Promise<UnlockResult> {
  if (!/^\d{4,8}$/.test(pin)) return { ok: false, error: "INVALID_PIN" };

  const sb = createAdminClient();

  // Login eligibility: must be active AND not soft-deleted.
  const { data: admins, error } = await sb
    .from("admin_users")
    .select("id, salon_id, email, role, pin_hash, display_name")
    .eq("is_active", true)
    .is("deleted_at", null);

  if (error || !admins || admins.length === 0) return { ok: false, error: "NO_ADMIN" };

  // Single-tenant: every active admin shares the same salon_id.
  const salonId = admins[0].salon_id as string;
  const { data: salon } = await sb
    .from("salons")
    .select("pin_failed_attempts, pin_locked_until")
    .eq("id", salonId)
    .maybeSingle();

  if (salon?.pin_locked_until && new Date(salon.pin_locked_until) > new Date()) {
    return { ok: false, error: "LOCKED_OUT", lockoutUntil: salon.pin_locked_until };
  }

  // Try each admin's pin_hash.
  let match: typeof admins[number] | null = null;
  for (const a of admins) {
    if (!a.pin_hash) continue;
    if (await bcrypt.compare(pin, a.pin_hash)) {
      match = a;
      break;
    }
  }

  if (!match) {
    const failed = (salon?.pin_failed_attempts ?? 0) + 1;
    const update: Record<string, unknown> = { pin_failed_attempts: failed };
    let lockoutUntil: string | undefined;
    if (failed >= MAX_ATTEMPTS) {
      lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
      update.pin_locked_until = lockoutUntil;
      update.pin_failed_attempts = 0;
    }
    await sb.from("salons").update(update).eq("id", salonId);
    return {
      ok: false,
      error: failed >= MAX_ATTEMPTS ? "LOCKED_OUT" : "INVALID_PIN",
      remaining: Math.max(0, MAX_ATTEMPTS - failed),
      lockoutUntil,
    };
  }

  // Reset salon-level counter on success.
  await sb.from("salons").update({ pin_failed_attempts: 0, pin_locked_until: null }).eq("id", salonId);

  const role = (match.role ?? "admin") as AdminRole;
  const token = await createSession({
    adminUserId: match.id,
    salonId: match.salon_id!,
    email: match.email ?? "",
    role,
    displayName: match.display_name ?? match.email ?? "Admin",
  });
  await setSessionCookie(token);
  return { ok: true };
}

export async function lockAdmin() {
  await clearSessionCookie();
}
