"use server";

import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSession, setSessionCookie, clearSessionCookie } from "./admin-session";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

type UnlockResult =
  | { ok: true }
  | { ok: false; error: "INVALID_PIN" | "LOCKED_OUT" | "NO_ADMIN" | "INTERNAL"; lockoutUntil?: string; remaining?: number };

export async function unlockAdmin(pin: string): Promise<UnlockResult> {
  if (!/^\d{4,8}$/.test(pin)) return { ok: false, error: "INVALID_PIN" };

  const sb = createAdminClient();
  const { data: admin, error } = await sb
    .from("admin_users")
    .select("id, salon_id, email, role, pin_hash, failed_pin_attempts, locked_until")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (error || !admin || !admin.pin_hash) return { ok: false, error: "NO_ADMIN" };

  // Check lockout
  if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
    return { ok: false, error: "LOCKED_OUT", lockoutUntil: admin.locked_until };
  }

  const valid = await bcrypt.compare(pin, admin.pin_hash);

  if (!valid) {
    const failed = (admin.failed_pin_attempts ?? 0) + 1;
    const update: Record<string, unknown> = {
      failed_pin_attempts: failed,
      last_pin_attempt_at: new Date().toISOString(),
    };
    if (failed >= MAX_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      update.locked_until = lockUntil.toISOString();
      update.failed_pin_attempts = 0;
    }
    await sb.from("admin_users").update(update).eq("id", admin.id);
    return {
      ok: false,
      error: failed >= MAX_ATTEMPTS ? "LOCKED_OUT" : "INVALID_PIN",
      remaining: Math.max(0, MAX_ATTEMPTS - failed),
      lockoutUntil: failed >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString() : undefined,
    };
  }

  // Reset counter, set session
  await sb
    .from("admin_users")
    .update({ failed_pin_attempts: 0, locked_until: null, last_pin_attempt_at: new Date().toISOString() })
    .eq("id", admin.id);

  const token = await createSession({
    adminUserId: admin.id,
    salonId: admin.salon_id!,
    email: admin.email!,
    role: (admin.role ?? "admin") as "admin" | "superadmin",
  });
  await setSessionCookie(token);
  return { ok: true };
}

export async function lockAdmin() {
  await clearSessionCookie();
}
