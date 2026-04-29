"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderEmail } from "@/lib/email/templates";

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
    .select("id, email, name")
    .eq("slug", process.env.NEXT_PUBLIC_DEFAULT_SALON_SLUG ?? "trisa")
    .single();
  if (!salon) return { ok: false as const, error: "NO_SALON" };

  // Upsert customer
  const { data: existing } = await sb
    .from("customers")
    .select("id")
    .eq("salon_id", salon.id)
    .eq("phone", data.customerPhone)
    .maybeSingle();

  let customerId = existing?.id as string | undefined;
  if (!customerId) {
    const { data: created } = await sb
      .from("customers")
      .insert({ salon_id: salon.id, phone: data.customerPhone, name: data.customerName, email: data.customerEmail || null })
      .select("id")
      .single();
    customerId = created?.id;
  }
  if (!customerId) return { ok: false as const, error: "CUSTOMER_FAILED" };

  const total = data.items.reduce((sum, it) => sum + it.price * it.quantity, 0);

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
    })
    .select("id")
    .single();
  if (error || !order) return { ok: false as const, error: "ORDER_FAILED" };

  // Email Triša (best-effort, don't block on failure)
  try {
    await sendOrderEmail({
      to: salon.email ?? "",
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail || null,
      pickupNote: data.pickupNote || null,
      items: data.items.map((it) => ({ name: it.name, quantity: it.quantity, price: it.price })),
      total,
      orderId: order.id,
    });
  } catch (e) {
    // Log only the message — the error object may serialize the customer email/name passed to sendOrderEmail.
    console.error("order email failed:", e instanceof Error ? e.message : "unknown");
  }

  return { ok: true as const, orderId: order.id };
}
