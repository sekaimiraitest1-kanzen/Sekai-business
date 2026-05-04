import "server-only";
import webpush, { type PushSubscription } from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:noreply@berbernicatrisa.rs";

let initialized = false;
function ensureInit() {
  if (initialized) return;
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    // Don't throw — push should be a soft enhancement. If keys are missing
    // (e.g. preview deployment without env), every send below short-circuits.
    return;
  }
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  initialized = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Fan out a notification to every push_subscriptions row for the given
 * salon. On the wire we get back a 404 / 410 when a subscription is no
 * longer valid (user uninstalled the PWA, browser revoked permission, GC'd
 * keys) — those rows are pruned in place so the next call doesn't re-hit
 * them.
 *
 * Best-effort: failures are logged but never thrown. Booking flows must
 * not block on push.
 */
export async function sendPushToSalon(salonId: string, payload: PushPayload): Promise<{ sent: number; pruned: number }> {
  ensureInit();
  if (!initialized) return { sent: 0, pruned: 0 };

  const sb = createAdminClient();
  const { data: subs, error } = await sb
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("salon_id", salonId);

  if (error || !subs || subs.length === 0) {
    return { sent: 0, pruned: 0 };
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  const pruneIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (s) => {
      const sub: PushSubscription = {
        endpoint: s.endpoint as string,
        keys: { p256dh: s.p256dh as string, auth: s.auth as string },
      };
      try {
        await webpush.sendNotification(sub, body, { TTL: 60 * 60 * 24 });
        sent += 1;
      } catch (err: unknown) {
        const status =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        if (status === 404 || status === 410) {
          pruneIds.push(s.id as string);
        } else {
          console.error("[push] send failed:", status, err instanceof Error ? err.message : err);
        }
      }
    })
  );

  if (pruneIds.length > 0) {
    await sb.from("push_subscriptions").delete().in("id", pruneIds);
  }

  return { sent, pruned: pruneIds.length };
}
