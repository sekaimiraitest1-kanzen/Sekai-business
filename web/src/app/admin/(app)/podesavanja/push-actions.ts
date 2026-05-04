"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { sendPushToSalon } from "@/lib/push/server";

export type SubscribePushInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
};

export async function subscribePush(input: SubscribePushInput) {
  const session = await requireAdmin();
  if (!input.endpoint || !input.p256dh || !input.auth) {
    return { ok: false as const, error: "INVALID_INPUT" };
  }
  const sb = createAdminClient();
  const { error } = await sb
    .from("push_subscriptions")
    .upsert(
      {
        admin_user_id: session.adminUserId,
        salon_id: session.salonId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_agent: input.userAgent ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "admin_user_id,endpoint" }
    );
  if (error) {
    console.error("[push] subscribe failed:", error.message);
    return { ok: false as const, error: "DB_FAILED" };
  }
  return { ok: true as const };
}

export async function unsubscribePush(endpoint: string) {
  const session = await requireAdmin();
  if (!endpoint) return { ok: false as const, error: "INVALID_INPUT" };
  const sb = createAdminClient();
  await sb
    .from("push_subscriptions")
    .delete()
    .eq("admin_user_id", session.adminUserId)
    .eq("endpoint", endpoint);
  return { ok: true as const };
}

/**
 * Fire a synthetic notification at every device subscribed for this admin's
 * salon. Used by the "test" button in podešavanja so Triša can confirm the
 * lock-screen flow works after granting permission.
 */
export async function sendTestPush() {
  const session = await requireAdmin();
  const res = await sendPushToSalon(session.salonId, {
    title: "Test obaveštenje",
    body: "Push radi. Ovako će izgledati svaki novi termin.",
    url: "/admin/termini",
    tag: "test",
  });
  return { ok: true as const, sent: res.sent, pruned: res.pruned };
}
