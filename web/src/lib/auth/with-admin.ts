import { getSession, type AdminSession } from "./admin-session";

export async function requireAdmin(): Promise<AdminSession> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}
