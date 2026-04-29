"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { sendOrderReadyEmail } from "@/lib/email/templates";

export async function updateOrderStatus(id: string, status: "pending" | "ready" | "picked_up" | "cancelled") {
  const session = await requireAdmin();
  const sb = createAdminClient();

  // Read current state so we can detect transition into 'ready' and
  // gather customer email + salon contact for the pickup notification.
  const { data: before } = await sb
    .from("orders")
    .select("status, total, customers(name, email)")
    .eq("id", id)
    .eq("salon_id", session.salonId)
    .single();

  await sb.from("orders").update({ status }).eq("id", id).eq("salon_id", session.salonId);

  // G2: pickup-ready notification — only fire on the *transition* into 'ready'.
  // Best-effort; failure does not block the status update.
  if (status === "ready" && before && before.status !== "ready") {
    const customer = Array.isArray(before.customers) ? before.customers[0] : before.customers;
    if (customer?.email) {
      try {
        const { data: salon } = await sb
          .from("salons")
          .select("address, phone")
          .eq("id", session.salonId)
          .single();
        await sendOrderReadyEmail({
          to: customer.email,
          customerName: customer.name ?? "—",
          total: before.total ?? 0,
          orderId: id,
          salonAddress: salon?.address ?? "",
          salonPhone: salon?.phone ?? "",
        });
      } catch (e) {
        console.error("order-ready email failed:", e instanceof Error ? e.message : "unknown");
      }
    }
  }

  revalidatePath("/admin/shop/porudzbine");
  return { ok: true as const };
}
