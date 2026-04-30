import { NextRequest, NextResponse } from "next/server";
import { logServerError } from "@/lib/error-log";

/**
 * Receives client-side errors from app/error.tsx + global-error.tsx via
 * `logClientError()` helper. Validates loosely (no auth — RLS allows
 * anonymous INSERT into `error_log`) and persists via service-role client.
 *
 * Rate limiting is intentionally absent for V1 — the volume is bounded by
 * how often the app actually errors, which should be near-zero. If we ever
 * see flood-style spam to this endpoint, V1.1 adds an IP cap via Vercel
 * Edge middleware (same plan as the booking spam mitigation flagged in
 * docs/rls-audit-2026-04-30.md Finding 1).
 */

export const runtime = "nodejs"; // service-role admin client needs Node runtime

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const message = typeof b.message === "string" ? b.message : "(no message)";
  const stack = typeof b.stack === "string" ? b.stack : undefined;
  const url = typeof b.url === "string" ? b.url : undefined;
  const userAgent = typeof b.userAgent === "string" ? b.userAgent : undefined;
  const digest = typeof b.digest === "string" ? b.digest : undefined;
  const surface = b.surface === "global" || b.surface === "server" ? b.surface : "client";

  await logServerError({ message, stack, url, surface, userAgent, digest });
  return NextResponse.json({ ok: true });
}
