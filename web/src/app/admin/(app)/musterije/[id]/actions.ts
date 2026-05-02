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
 * Redeem loyalty reward — Triša picks ONE of two options after asking the
 * customer which they prefer. The choice is stored on the customer row
 * (`loyalty_pending_reward`) and consumed automatically by the next
 * applicable transaction:
 *   - `free_cut`  → next booking auto-applies price=0 + bookings.is_loyalty_redeem
 *   - `shop_20`   → next order auto-applies 20% off total + orders.is_loyalty_discount
 *
 * The redeem event itself still drops the visit counter so the customer
 * starts a fresh loyalty cycle.
 */
export async function redeemLoyalty(
  customerId: string,
  pointsCost: number,
  rewardType: "free_cut" | "shop_20",
) {
  const session = await requireAdmin();
  const sb = createAdminClient();

  // Block stacking — only one pending reward at a time. If Triša already
  // gave the customer a reward and they haven't consumed it yet, refuse
  // until that one is used (or manually cleared via SQL).
  const { data: cust } = await sb
    .from("customers")
    .select("loyalty_pending_reward")
    .eq("id", customerId)
    .eq("salon_id", session.salonId)
    .maybeSingle();
  if (cust?.loyalty_pending_reward) {
    return { ok: false as const, error: "REWARD_ALREADY_PENDING" };
  }

  const { error: evErr } = await sb.from("loyalty_events").insert({
    salon_id: session.salonId,
    customer_id: customerId,
    event_type: "redeem",
    points: pointsCost,
  });
  if (evErr) return { ok: false as const, error: evErr.message };

  const { error: cuErr } = await sb
    .from("customers")
    .update({ loyalty_pending_reward: rewardType })
    .eq("id", customerId)
    .eq("salon_id", session.salonId);
  if (cuErr) return { ok: false as const, error: cuErr.message };

  revalidatePath(`/admin/musterije/${customerId}`);
  return { ok: true as const, rewardType };
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
