import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_COOKIE = "trisha_admin";

async function verify(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY!);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login route + assets
  if (pathname === "/admin/login" || pathname.startsWith("/admin/_next") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    if (!token || !(await verify(token))) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
