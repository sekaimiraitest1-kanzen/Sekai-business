/**
 * Pure role + session-shape definitions. Kept in its own module so client
 * components can `isStaff(session)` without dragging in `next/headers`
 * (which only resolves in a Server Component context).
 */

export type AdminRole = "admin" | "superadmin" | "staff";

export type AdminSession = {
  adminUserId: string;
  salonId: string;
  email: string;
  role: AdminRole;
  displayName: string;
};

export function isOwner(s: AdminSession): boolean {
  return s.role === "admin" || s.role === "superadmin";
}

export function isStaff(s: AdminSession): boolean {
  return s.role === "staff";
}
