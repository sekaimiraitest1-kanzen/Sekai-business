"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderEmail, sendOrderConfirmationToCustomer } from "@/lib/email/templates";
import { normalizePhone } from "@/lib/phone";
import { sendPushToSalon } from "@/lib/push/server";

const orderSchema = z.object({
  customerName: z.string().min(2).max(80),
  customerPhone: z.string().min(6).max(20),
  customerEmail: z.string().email().optional().or(z.literal("")),
  items: z.array(z.object({
    productId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID format"),
    name: z.string(),
    quantity: z.number().int().min(1).max(10),
    price: z.number().int().min(0),
  })).min(1),
  pickupNote: z.string().max(500).optional().or(z.literal("")),
});

export type OrderInput = z.infer<typeof orderSchema>;

export async function submitOrder(input: OrderInput) {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "INVALID_INPUT" };
  const data = parsed.data;

  const sb = createAdminClient();
  const { data: salon } = await sb
    .from("salons")
    .select("id, email, name, address, phone")
    .eq("slug", process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG ?? "trisa")
    .single();
  if (!salon) return { ok: false as const, error: "NO_SALON" };

  // Canonicalize phone before any DB write so the same human shows up
  // as one customer whether they booked first or shopped first.
  const phone = normalizePhone(data.customerPhone);

  // Upsert customer (skip soft-deleted rows — same phone re-buying after
  // delete starts fresh). Pull loyalty_pending_reward so we can auto-apply
  // the 20% shop discount if the customer earned + chose it.
  const { data: existing } = await sb
    .from("customers")
    .select("id, loyalty_pending_reward")
    .eq("salon_id", salon.id)
    .eq("phone", phone)
    .is("deleted_at", null)
    .maybeSingle();

  let customerId = existing?.id as string | undefined;
  if (!customerId) {
    const { data: created } = await sb
      .from("customers")
      .insert({ salon_id: salon.id, phone, name: data.customerName, email: data.customerEmail || null })
      .select("id")
      .single();
    customerId = created?.id;
  }
  if (!customerId) return { ok: false as const, error: "CUSTOMER_FAILED" };

  const subtotal = data.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  // Auto-apply -20% loyalty discount if the customer redeemed for shop_20.
  // We don't allow rewards to chain — the discount is consumed on this
  // single order regardless of items / quantity / final total.
  const isLoyaltyDiscount = existing?.loyalty_pending_reward === "shop_20";
  const total = isLoyaltyDiscount ? Math.round(subtotal * 0.8) : subtotal;

  // Decrement stock atomically (best-effort)
  for (const it of data.items) {
    const { data: p } = await sb.from("products").select("stock").eq("id", it.productId).single();
    if (p && p.stock >= it.quantity) {
      await sb.from("products").update({ stock: p.stock - it.quantity }).eq("id", it.productId);
    }
  }

  const { data: order, error } = await sb
    .from("orders")
    .insert({
      salon_id: salon.id,
      customer_id: customerId,
      items: data.items,
      total,
      status: "pending",
      pickup_note: data.pickupNote || null,
      is_loyalty_discount: isLoyaltyDiscount,
    })
    .select("id")
    .single();
  if (error || !order) return { ok: false as const, error: "ORDER_FAILED" };

  // Consume the reward so it can't be replayed on a parallel session.
  // Only after a successful order insert — a transient DB failure leaves
  // the reward intact for the next attempt.
  if (isLoyaltyDiscount && customerId) {
    await sb.from("customers").update({ loyalty_pending_reward: null }).eq("id", customerId);
  }

  // Two emails fired in parallel, both best-effort. Failure of either does
  // NOT roll the order back — the row is already in DB, Triša can recover
  // even if email infra is wonky.
  // 1. Internal: salon owner gets the order alert (existing behaviour).
  // 2. Customer-facing: confirmation receipt so the buyer doesn't depend on
  //    keeping the success page open. Skipped silently if no email given.
  const itemSummary = data.items.length === 1
    ? `${data.items[0].quantity}× ${data.items[0].name}`
    : `${data.items.reduce((s, it) => s + it.quantity, 0)} stavki`;

  await Promise.allSettled([
    sendOrderEmail({
      to: salon.email ?? "",
      customerName: data.customerName,
      customerPhone: phone,
      customerEmail: data.customerEmail || null,
      pickupNote: data.pickupNote || null,
      items: data.items.map((it) => ({ name: it.name, quantity: it.quantity, price: it.price })),
      total,
      orderId: order.id,
    }).catch((e) => console.error("order email (owner) failed:", e instanceof Error ? e.message : "unknown")),
    sendOrderConfirmationToCustomer({
      to: data.customerEmail || "",
      customerName: data.customerName,
      items: data.items.map((it) => ({ name: it.name, quantity: it.quantity, price: it.price })),
      subtotal,
      total,
      loyaltyDiscount: isLoyaltyDiscount,
      orderId: order.id,
      salonAddress: salon.address ?? "",
      salonPhone: salon.phone ?? "",
    }).catch((e) => console.error("order email (customer) failed:", e instanceof Error ? e.message : "unknown")),
    sendPushToSalon(salon.id, {
      title: `Nova porudžbina · ${total} RSD`,
      body: `${data.customerName} · ${itemSummary}`,
      url: "/admin/shop/porudzbine",
      tag: `order-${order.id}`,
    }),
  ]);

  return { ok: true as const, orderId: order.id, loyaltyDiscount: isLoyaltyDiscount, subtotal, total };
}
