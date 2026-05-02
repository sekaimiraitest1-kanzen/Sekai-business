import { getSession, isOwner, isStaff, type AdminSession } from "./admin-session";

/**
 * Generic admin gate — accepts any logged-in admin (owner OR staff). Use this
 * for routes both roles can see (Termini, Statistike-self, Mušterije-self).
 */
export async function requireAdmin(): Promise<AdminSession> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

/**
 * Owner-only gate. Use for routes/actions that staff must NOT touch:
 * services, gallery, sajt content, blocked-slots, podesavanja, products.
 * Staff hitting these throws FORBIDDEN_STAFF.
 */
export async function requireOwner(): Promise<AdminSession> {
  const s = await requireAdmin();
  if (s.role === "staff") throw new Error("FORBIDDEN_STAFF");
  return s;
}

export { isOwner, isStaff };
