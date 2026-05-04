"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/with-admin";
import { sendOrderReadyEmail } from "@/lib/email/templates";

export type UpdateOrderStatusResult =
  | { ok: true }
  | { ok: false; error: "NOT_FOUND" | "DB_FAILED" | "FORBIDDEN" };

const STATUSES = ["pending", "ready", "picked_up", "cancelled"] as const;
type OrderStatus = (typeof STATUSES)[number];

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<UpdateOrderStatusResult> {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return { ok: false, error: "FORBIDDEN" };
  }

  if (!STATUSES.includes(status)) return { ok: false, error: "DB_FAILED" };

  const sb = createAdminClient();

  // Read current state so we can detect transition into 'ready' and gather
  // customer email + salon contact for the pickup notification.
  const { data: before, error: beforeErr } = await sb
    .from("orders")
    .select("status, total, customers(name, email)")
    .eq("id", id)
    .eq("salon_id", session.salonId)
    .maybeSingle();

  if (beforeErr) {
    console.error("[orders] read failed:", beforeErr.message);
    return { ok: false, error: "DB_FAILED" };
  }
  if (!before) return { ok: false, error: "NOT_FOUND" };

  const { error: updErr } = await sb
    .from("orders")
    .update({ status })
    .eq("id", id)
    .eq("salon_id", session.salonId);

  if (updErr) {
    console.error("[orders] update failed:", updErr.message);
    return { ok: false, error: "DB_FAILED" };
  }

  // G2: pickup-ready notification — only fire on the *transition* into 'ready'.
  // Best-effort; failure does not block the status update.
  if (status === "ready" && before.status !== "ready") {
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
        console.error("[orders] ready-email failed:", e instanceof Error ? e.message : "unknown");
      }
    }
  }

  revalidatePath("/admin/shop/porudzbine");
  return { ok: true };
}
