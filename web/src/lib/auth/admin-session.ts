import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "trisha_admin";
const SESSION_TTL_HOURS = 24;

function getSecret(): Uint8Array {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw) throw new Error("SUPABASE_SERVICE_ROLE_KEY required for admin session signing");
  return new TextEncoder().encode(raw);
}

export type AdminSession = {
  adminUserId: string;
  salonId: string;
  email: string;
  role: "admin" | "superadmin";
};

export async function createSession(session: AdminSession): Promise<string> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_HOURS}h`)
    .sign(getSecret());
  return token;
}

export async function verifyToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      adminUserId: payload.adminUserId as string,
      salonId: payload.salonId as string,
      email: payload.email as string,
      role: payload.role as "admin" | "superadmin",
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_HOURS * 60 * 60,
  });
}

export async function clearSessionCookie() {
  cookies().set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<AdminSession | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
