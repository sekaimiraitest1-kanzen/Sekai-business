/**
 * Error capture — writes to Supabase `error_log` (see migration 006). Two
 * surfaces:
 *
 *   logServerError() — call from server actions / route handlers / RSC. Uses
 *     the service-role admin client, which bypasses RLS so the insert never
 *     fails on auth. Always captures full stack.
 *
 *   logClientError() — call from "use client" error boundaries. Posts to a
 *     /api/error-log endpoint that does the privileged insert. Anon RLS
 *     INSERT is also allowed as fallback.
 *
 * Both callers are fire-and-forget. They MUST NOT throw — an error inside
 * the error logger would mask the real error. Wrapped in try/catch + return
 * promise that always resolves.
 */

const MESSAGE_MAX = 1000;
const STACK_MAX = 8000;

type Surface = "server" | "client" | "global";

export type ErrorLogPayload = {
  message: string;
  stack?: string;
  url?: string;
  surface: Surface;
  userAgent?: string;
  digest?: string;
};

function sanitize(input: ErrorLogPayload): ErrorLogPayload {
  return {
    message: input.message.slice(0, MESSAGE_MAX),
    stack: input.stack?.slice(0, STACK_MAX),
    url: input.url?.slice(0, 500),
    surface: input.surface,
    userAgent: input.userAgent?.slice(0, 300),
    digest: input.digest?.slice(0, 100),
  };
}

/**
 * Server-side error logger. Use from Server Actions, route handlers, or
 * server components catch-blocks. Never throws.
 */
export async function logServerError(payload: ErrorLogPayload): Promise<void> {
  try {
    // Lazy import so this module can be imported from client code too without
    // pulling supabase admin (which references SUPABASE_SERVICE_ROLE_KEY) into
    // the client bundle.
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const sb = createAdminClient();
    await sb.from("error_log").insert({
      message: sanitize(payload).message,
      stack: sanitize(payload).stack,
      url: sanitize(payload).url,
      surface: payload.surface,
      user_agent: sanitize(payload).userAgent,
      digest: sanitize(payload).digest,
    });
  } catch (writeErr) {
    // Last resort — write to stderr so it lands in Vercel logs at least.
    // eslint-disable-next-line no-console
    console.error("[error-log] failed to persist:", writeErr, "original:", payload);
  }
}

/**
 * Client-side helper. POSTs to /api/error-log which is wired to do the same
 * insert server-side via service-role. Falls back to console if the fetch
 * fails so the original error never gets entirely swallowed.
 */
export async function logClientError(payload: Omit<ErrorLogPayload, "surface" | "userAgent" | "url"> & { surface?: Surface }): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/error-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        surface: payload.surface ?? "client",
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
      keepalive: true, // survive page navigation away from the error
    });
  } catch (fetchErr) {
    // eslint-disable-next-line no-console
    console.error("[error-log] client post failed:", fetchErr, "original:", payload);
  }
}
