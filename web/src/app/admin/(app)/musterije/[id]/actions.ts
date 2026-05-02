"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireOwner } from "@/lib/auth/with-admin";

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

/**
 * Soft-delete a customer. Owner-only — staff hitting this throws via
 * requireOwner. We don't wipe the row because past bookings still reference
 * it and Triša's revenue / repeat-customer stats need that history. Setting
 * `deleted_at` makes the customer disappear from the Mušterije list, the
 * profile becomes 404, and the public booking + walk-in lookups treat the
 * phone number as fresh (so a re-booking with the same phone creates a new
 * customer row instead of resurrecting the deleted one).
 *
 * Returns redirect on success rather than ok-tuple — the customer profile
 * page calling this can't usefully render anything once the customer is gone.
 */
export async function deleteCustomer(id: string) {
  const session = await requireOwner();
  const sb = createAdminClient();
  const { error } = await sb
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("salon_id", session.salonId)
    .is("deleted_at", null);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/musterije");
  redirect("/admin/musterije");
}
