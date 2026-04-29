"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";

export async function saveCustomerNote(id: string, note: string) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  await sb.from("customers").update({ admin_notes: note }).eq("id", id).eq("salon_id", session.salonId);
  revalidatePath(`/admin/musterije/${id}`);
  return { ok: true as const };
}

/**
 * G1 — Redeem loyalty reward. Inserts a `redeem` event with points = the
 * configured threshold (6 by default). Net visit-redeem balance drops back
 * below the threshold so the UI no longer shows the "ready to redeem" state.
 */
export async function redeemLoyalty(customerId: string, pointsCost: number) {
  const session = await requireAdmin();
  const sb = createAdminClient();
  const { error } = await sb.from("loyalty_events").insert({
    salon_id: session.salonId,
    customer_id: customerId,
    event_type: "redeem",
    points: pointsCost,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/admin/musterije/${customerId}`);
  return { ok: true as const };
}
